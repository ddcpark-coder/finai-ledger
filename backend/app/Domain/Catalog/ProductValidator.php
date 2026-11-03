<?php

namespace App\Domain\Catalog;

final class ProductValidator
{
    public static function assertValid(array $product): void
    {
        if (empty(trim((string) ($product['sku'] ?? '')))) {
            throw new \DomainException('SKU is required.');
        }

        if (empty(trim((string) ($product['name'] ?? '')))) {
            throw new \DomainException('Product name is required.');
        }

        if (! in_array($product['type'] ?? 'product', ['product', 'service'], true)) {
            throw new \DomainException('Unsupported product type.');
        }

        foreach (['purchase_price', 'sales_price', 'min_sales_price'] as $field) {
            if (isset($product[$field]) && (float) $product[$field] < 0) {
                throw new \DomainException($field.' cannot be negative.');
            }
        }

        if (
            isset($product['sales_price'], $product['min_sales_price']) &&
            (float) $product['sales_price'] < (float) $product['min_sales_price']
        ) {
            throw new \DomainException('Default sales price cannot be below minimum sales price.');
        }
    }
}
