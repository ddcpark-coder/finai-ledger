<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

final class DemoIncomingInvoicesController extends Controller
{
    private function companyAccess(Request $request, int $companyId): int
    {
        abort_unless(config('finai.demo_workflows_enabled', false), 404);
        $user=$request->user();
        abort_unless($user && Gate::forUser($user)->allows('company.access', $companyId), 403);
        return (int) $user->id;
    }

    private function requiredPermission(int $companyId, int $userId, string $permission): void
    {
        $allowed=DB::table('company_user as membership')
            ->join('roles as role','role.id','=','membership.role_id')
            ->join('permission_role as assignment','assignment.role_id','=','role.id')
            ->join('permissions as permission','permission.id','=','assignment.permission_id')
            ->where('membership.company_id',$companyId)
            ->where('membership.user_id',$userId)
            ->where('membership.status','active')
            ->where('permission.key',$permission)
            ->exists();
        abort_unless($allowed, 403);
    }

    private function normalized(string $text): string
    {
        return mb_strtolower(preg_replace('/\s+/u',' ',trim($text)), 'UTF-8');
    }

    private function cents(string $amount): int
    {
        $value=str_replace(',', '.', trim($amount));
        if (! preg_match('/^\d{1,6}(?:\.\d{1,2})?$/D', $value)) {
            abort(422,'Bruto znesek mora biti med 0,01 in 999.999,99 EUR.');
        }
        [$whole,$fraction]=array_pad(explode('.', $value, 2),2,'');
        $cents=(int) $whole*100+(int)str_pad($fraction,2,'0');
        abort_unless($cents>0 && $cents<=99999999,422,'Neveljaven bruto znesek.');
        return $cents;
    }

    public function index(Request $request, int $companyId): JsonResponse
    {
        $this->companyAccess($request,$companyId);
        $rows=DB::table('demo_incoming_invoices')
            ->where('company_id',$companyId)
            ->orderByDesc('id')->limit(100)
            ->get(['id','company_id','partner_name','invoice_number','gross_cents',
                'issue_date','due_date','currency','status','approved_at']);

        return response()->json(['data'=>$rows,'demo_only'=>true])
            ->header('Cache-Control','private, no-store');
    }

    public function store(Request $request, int $companyId): JsonResponse
    {
        $userId=$this->companyAccess($request,$companyId);
        $this->requiredPermission($companyId,$userId,'invoices.write');

        $data=$request->validate([
            'demo_only'=>['required','accepted'],
            'partner_name'=>['required','string','min:2','max:120'],
            'invoice_number'=>['required','string','min:2','max:60'],
            'gross_amount'=>['required','string','max:12'],
            'issue_date'=>['required','date_format:Y-m-d'],
            'due_date'=>['required','date_format:Y-m-d','after_or_equal:issue_date'],
        ]);
        $amount=$this->cents($data['gross_amount']);
        $partner=trim($data['partner_name']);
        $number=trim($data['invoice_number']);
        $partnerKey=$this->normalized($partner);
        $numberKey=$this->normalized($number);

        $id=DB::transaction(function () use ($companyId,$userId,$partner,$number,$partnerKey,$numberKey,$amount,$data): int {
            $duplicate=DB::table('demo_incoming_invoices')->where('company_id',$companyId)
                ->where('partner_key',$partnerKey)->where('invoice_number_key',$numberKey);
            abort_if($duplicate->exists(),409,'Ta demonstracijski račun že obstaja v izbranem podjetju.');
            $id=DB::table('demo_incoming_invoices')->insertGetId([
                'company_id'=>$companyId,'created_by'=>$userId,
                'partner_name'=>$partner,'partner_key'=>$partnerKey,
                'invoice_number'=>$number,'invoice_number_key'=>$numberKey,
                'gross_cents'=>$amount,'issue_date'=>$data['issue_date'],
                'due_date'=>$data['due_date'],'currency'=>'EUR','status'=>'review',
                'created_at'=>now(),'updated_at'=>now(),
            ]);
            DB::table('audit_logs')->insert([
                'company_id'=>$companyId,'actor_user_id'=>$userId,
                'event_type'=>'demo_incoming_invoice.created',
                'entity_type'=>'demo_incoming_invoice','entity_id'=>(string) $id,
                'metadata'=>json_encode(['demo_only'=>true,'gross_cents'=>$amount]),
                'created_at'=>now(),
            ]);
            return $id;
        });

        return response()->json(['data'=>[
            'id'=>$id,'company_id'=>$companyId,'status'=>'review',
        ],'demo_only'=>true],201)->header('Cache-Control','private, no-store');
    }

    public function approve(Request $request, int $companyId, int $invoiceId): JsonResponse
    {
        $userId=$this->companyAccess($request,$companyId);
        $this->requiredPermission($companyId,$userId,'invoices.approve');
        $request->validate(['demo_only'=>['required','accepted']]);

        $result=DB::transaction(function () use ($companyId,$invoiceId,$userId): array {
            $invoice=DB::table('demo_incoming_invoices')
                ->where('company_id',$companyId)->where('id',$invoiceId)
                ->lockForUpdate()->first();
            abort_unless($invoice,404);
            abort_unless($invoice->status==='review',409,'Demo račun ni več v statusu za pregled.');
            $changed=DB::table('demo_incoming_invoices')
                ->where('company_id',$companyId)->where('id',$invoiceId)
                ->where('status','review')->update([
                    'status'=>'approved','approved_by'=>$userId,
                    'approved_at'=>now(),'updated_at'=>now(),
                ]);
            abort_unless($changed===1,409);
            DB::table('audit_logs')->insert([
                'company_id'=>$companyId,'actor_user_id'=>$userId,
                'event_type'=>'demo_incoming_invoice.approved',
                'entity_type'=>'demo_incoming_invoice','entity_id'=>(string) $invoiceId,
                'metadata'=>json_encode(['demo_only'=>true]),
                'created_at'=>now(),
            ]);
            return ['id'=>$invoiceId,'company_id'=>$companyId,'status'=>'approved'];
        });

        return response()->json(['data'=>$result,'demo_only'=>true])
            ->header('Cache-Control','private, no-store');
    }
}
