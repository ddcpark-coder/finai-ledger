<?php
namespace App\Domain\SalesOrders;

final class SalesOrderValidator
{
    public static function assertProgress(string $from, string $to): void
    {
        $allowed=[
            'confirmed'=>['in_progress','cancelled'],
            'in_progress'=>['ready_for_delivery','cancelled'],
            'ready_for_delivery'=>['partially_delivered','delivered'],
            'partially_delivered'=>['delivered'],
            'delivered'=>['invoiced'],
            'invoiced'=>['completed'],
        ];

        if (! in_array($to,$allowed[$from] ?? [],true)) {
            throw new \DomainException("Invalid sales order transition {$from} -> {$to}.");
        }
    }
}
