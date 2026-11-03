<?php
namespace App\Domain\Procurement;

final class PurchaseOrderWorkflow
{
    public static function assertTransition(string $from,string $to): void
    {
        $allowed=[
            'draft'=>['approved','cancelled'],
            'approved'=>['ordered','cancelled'],
            'ordered'=>['partially_received','received','cancelled'],
            'partially_received'=>['received'],
            'received'=>['matched','variance'],
            'variance'=>['matched'],
            'matched'=>['closed'],
        ];

        if (! in_array($to,$allowed[$from]??[],true)) {
            throw new \DomainException("Invalid purchase order transition {$from} -> {$to}.");
        }
    }

    public static function assertReceiptQuantity(float $ordered,float $alreadyReceived,float $newQuantity): void
    {
        if ($newQuantity<=0) throw new \DomainException('Received quantity must be positive.');
        if ($alreadyReceived+$newQuantity>$ordered+0.0001) {
            throw new \DomainException('Received quantity exceeds ordered quantity.');
        }
    }
}
