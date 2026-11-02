<?php

namespace App\Domain\AI;

final class ConfidencePolicy
{
    public const AUTO_ACCEPT_THRESHOLD = 98.0;
    public const HIGH_CONFIDENCE_THRESHOLD = 90.0;
    public const REVIEW_THRESHOLD = 70.0;

    public static function classify(float $confidence, string $riskLevel = 'normal'): string
    {
        if ($riskLevel !== 'normal') {
            return 'manual_review';
        }

        if ($confidence >= self::AUTO_ACCEPT_THRESHOLD) {
            return 'eligible_for_auto_accept';
        }

        if ($confidence >= self::HIGH_CONFIDENCE_THRESHOLD) {
            return 'high_confidence_review';
        }

        if ($confidence >= self::REVIEW_THRESHOLD) {
            return 'review';
        }

        return 'low_confidence';
    }

    public static function mayAutoAccept(float $confidence, string $riskLevel, bool $ruleAllowsAutomation): bool
    {
        return $ruleAllowsAutomation
            && $riskLevel === 'normal'
            && $confidence >= self::AUTO_ACCEPT_THRESHOLD;
    }
}
