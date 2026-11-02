<?php

namespace App\Domain\Partners;

enum PartnerType: string
{
    case Company = 'company';
    case SoleTrader = 'sole_trader';
    case Individual = 'individual';
    case PublicEntity = 'public_entity';
}
