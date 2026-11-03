<?php
namespace App\Domain\Inventory;

final class InventoryMath
{
    public static function available(float $onHand,float $reserved): float
    {
        return round($onHand-$reserved,4);
    }

    public static function assertPositiveQuantity(float $quantity): void
    {
        if ($quantity<=0) throw new \DomainException('Inventory quantity must be positive.');
    }

    public static function assertCanReserve(float $available,float $quantity): void
    {
        self::assertPositiveQuantity($quantity);
        if ($quantity>$available+0.0001) {
            throw new \DomainException('Insufficient available inventory for reservation.');
        }
    }
}
