<?php

namespace App\Application\AI;

use Illuminate\Support\Facades\DB;

final class DetectInvoiceAnomalies
{
    public function execute(int $invoiceId): array
    {
        $invoice = DB::table('incoming_invoices')->find($invoiceId);
        if (! $invoice) {
            throw new \DomainException('Incoming invoice not found.');
        }

        $anomalies = [];

        if ($invoice->partner_id && $invoice->gross_amount !== null) {
            $average = DB::table('incoming_invoices')
                ->where('company_id', $invoice->company_id)
                ->where('partner_id', $invoice->partner_id)
                ->where('status', 'posted')
                ->where('id', '<>', $invoiceId)
                ->avg('gross_amount');

            if ($average && (float) $invoice->gross_amount > (float) $average * 3) {
                $anomalies[] = [
                    'type' => 'amount_spike',
                    'severity' => 'high',
                    'score' => 92.0,
                    'evidence' => [
                        'gross_amount' => $invoice->gross_amount,
                        'historical_average' => $average,
                    ],
                ];
            }
        }

        if ($invoice->extraction_confidence !== null && (float) $invoice->extraction_confidence < 70) {
            $anomalies[] = [
                'type' => 'low_extraction_confidence',
                'severity' => 'medium',
                'score' => 75.0,
                'evidence' => ['extraction_confidence' => $invoice->extraction_confidence],
            ];
        }

        foreach ($anomalies as $anomaly) {
            DB::table('ai_anomalies')->insert([
                'company_id' => $invoice->company_id,
                'incoming_invoice_id' => $invoiceId,
                'type' => $anomaly['type'],
                'severity' => $anomaly['severity'],
                'score' => $anomaly['score'],
                'status' => 'open',
                'evidence_json' => json_encode($anomaly['evidence']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $anomalies;
    }
}
