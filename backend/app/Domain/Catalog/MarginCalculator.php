<?php

namespace App\Domain\Catalog;

final class MarginCalculator
{
    public static function grossMarginPercent(string|float|int $salesPrice, string|float|int $purchasePrice): float
    {
        $sales = (float) $salesPrice;
        $purchase = (float) $purchasePrice;

        if ($sales <= 0) {
            throw new \DomainException('Sales price must be positive.');
        }

        return round((($sales - $purchase) / $sales) * 100, 2);
    }

    public static function markupPercent(string|float|int $salesPrice, string|float|int $purchasePrice): float
    {
        $sales = (float) $salesPrice;
        $purchase = (float) $purchasePrice;

        if ($purchase <= 0) {
            throw new \DomainException('Purchase price must be positive.');
        }

        return round((($sales - $purchase) / $purchase) * 100, 2);
    }
}
