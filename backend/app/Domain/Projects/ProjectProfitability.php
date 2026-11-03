<?php
namespace App\Domain\Projects;

final class ProjectProfitability
{
    public static function calculate(float $revenue,float $cost): array
    {
        $margin=round($revenue-$cost,2);
        $marginPercent=$revenue>0 ? round(($margin/$revenue)*100,2) : null;

        return [
            'revenue'=>round($revenue,2),
            'cost'=>round($cost,2),
            'margin'=>$margin,
            'margin_percent'=>$marginPercent,
        ];
    }

    public static function assertHours(float $hours): void
    {
        if ($hours<=0 || $hours>24) {
            throw new \DomainException('Time entry hours must be greater than 0 and at most 24.');
        }
    }
}
