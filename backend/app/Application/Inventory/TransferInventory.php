<?php
namespace App\Application\Inventory;

final class TransferInventory
{
    public function __construct(private PostInventoryMovement $movements) {}

    public function execute(
        int $companyId,int $productId,int $fromWarehouseId,?int $fromLocationId,
        int $toWarehouseId,?int $toLocationId,float $quantity,int $userId,string $reference
    ): void {
        if ($fromWarehouseId===$toWarehouseId && $fromLocationId===$toLocationId) {
            throw new \DomainException('Transfer source and destination are identical.');
        }

        $sourceId=crc32($reference.'|'.$productId.'|'.$quantity);
        $this->movements->execute($companyId,$productId,$fromWarehouseId,$fromLocationId,'transfer_out',-$quantity,'transfer',$sourceId,$userId,null,$reference);
        try {
            $this->movements->execute($companyId,$productId,$toWarehouseId,$toLocationId,'transfer_in',$quantity,'transfer',$sourceId,$userId,null,$reference);
        } catch (\Throwable $e) {
            $this->movements->execute($companyId,$productId,$fromWarehouseId,$fromLocationId,'transfer_rollback',$quantity,'transfer_rollback',$sourceId,$userId,null,$reference);
            throw $e;
        }
    }
}
