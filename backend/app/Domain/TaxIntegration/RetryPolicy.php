<?php

namespace App\Domain\TaxIntegration;

final class RetryPolicy
{
    public static function delaySeconds(int $attemptNo): int
    {
        return match (true) {
            $attemptNo <= 1 => 60,
            $attemptNo === 2 => 300,
            $attemptNo === 3 => 900,
            $attemptNo === 4 => 3600,
            default => 21600,
        };
    }

    public static function mayRetry(string $status, int $attemptNo): bool
    {
        return in_array($status, ['failed', 'processing'], true) && $attemptNo < 8;
    }
}
