<?php

namespace App\Application\Catalog;

use Illuminate\Support\Facades\DB;

final class ResolveSalesPrice
{
    public function execute(int $companyId, int $productId, ?int $partnerId, string|float|int $quantity = 1): array
    {
        $product = DB::table('products')
            ->where('id', $productId)
            ->where('company_id', $companyId)
            ->where('active', true)
            ->first();

        if (! $product) {
            throw new \DomainException('Product not found for active company.');
        }

        $qty = (float) $quantity;
        if ($qty <= 0) {
            throw new \DomainException('Quantity must be positive.');
        }

        $candidate = null;

        if ($partnerId) {
            $candidate = DB::table('price_list_items as i')
                ->join('price_lists as l', 'l.id', '=', 'i.price_list_id')
                ->join('partner_price_lists as p', 'p.price_list_id', '=', 'l.id')
                ->where('p.partner_id', $partnerId)
                ->where('l.company_id', $companyId)
                ->where('l.active', true)
                ->where('i.product_id', $productId)
                ->where('i.min_quantity', '<=', $qty)
                ->where(function ($q) {
                    $q->whereNull('l.valid_from')->orWhereDate('l.valid_from', '<=', now()->toDateString());
                })
                ->where(function ($q) {
                    $q->whereNull('l.valid_to')->orWhereDate('l.valid_to', '>=', now()->toDateString());
                })
                ->orderBy('l.priority')
                ->orderByDesc('i.min_quantity')
                ->select('i.price', 'i.discount_percent', 'l.id as price_list_id', 'l.name as price_list_name')
                ->first();
        }

        $price = $candidate?->price ?? $product->sales_price;
        if ($price === null) {
            throw new \DomainException('No sales price configured.');
        }

        $discount = $candidate?->discount_percent ?? $product->default_discount_percent ?? 0;

        return [
            'product_id' => $productId,
            'unit_price' => (string) $price,
            'discount_percent' => (string) $discount,
            'price_list_id' => $candidate?->price_list_id,
            'price_list_name' => $candidate?->price_list_name,
            'source' => $candidate ? 'price_list' : 'product_default',
        ];
    }
}
