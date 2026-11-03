<?php
namespace App\Application\Projects;

use Illuminate\Support\Facades\DB;

final class RefreshProjectSourceFinancials
{
    public function __construct(private SyncProjectFinancials $financials) {}

    public function execute(int $projectId): void
    {
        $project=DB::table('projects')->find($projectId);
        if (! $project) throw new \DomainException('Project not found.');

        $inventoryInvoiceIds=DB::table('purchase_invoice_matches as pim')
            ->join('purchase_orders as po','po.id','=','pim.purchase_order_id')
            ->join('purchase_order_lines as pol','pol.purchase_order_id','=','po.id')
            ->join('products as p','p.id','=','pol.product_id')
            ->where('po.project_id',$projectId)
            ->where('p.track_inventory',true)
            ->distinct()
            ->pluck('pim.incoming_invoice_id')
            ->all();

        foreach(DB::table('issued_invoices')->where('project_id',$projectId)->whereIn('status',['issued','sent','paid'])->get() as $invoice) {
            $this->financials->upsertEntry(
                $projectId,'revenue','invoicing',(float)$invoice->net_amount,
                'issued_invoice',$invoice->id,$invoice->issue_date ?: substr((string)$invoice->created_at,0,10),'Izdani račun '.$invoice->invoice_number,false
            );
        }

        foreach(DB::table('incoming_invoices')->where('project_id',$projectId)->whereIn('status',['approved','posted'])->get() as $invoice) {
            if (in_array($invoice->id,$inventoryInvoiceIds,true)) {
                continue;
            }

            $recognizedOn=$invoice->issue_date ?: substr((string)$invoice->created_at,0,10);
            $this->financials->upsertEntry(
                $projectId,'cost','supplier_invoice',(float)$invoice->net_amount,
                'incoming_invoice',$invoice->id,$recognizedOn,'Prejeti račun '.$invoice->invoice_number,false
            );
        }

        foreach(DB::table('inventory_movements')->where('project_id',$projectId)->where('quantity','<',0)->whereNotNull('unit_cost')->get() as $movement) {
            $this->financials->upsertEntry(
                $projectId,'cost','material',abs((float)$movement->quantity*(float)$movement->unit_cost),
                'inventory_movement',$movement->id,substr($movement->occurred_at,0,10),'Poraba materiala '.$movement->reference,false
            );
        }

        $this->financials->execute($projectId);
    }
}
