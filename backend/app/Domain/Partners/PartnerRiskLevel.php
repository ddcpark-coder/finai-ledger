<?php

namespace App\Domain\Partners;

enum PartnerRiskLevel: string
{
    case Normal = 'normal';
    case Review = 'review';
    case High = 'high';
    case Blocked = 'blocked';
}
