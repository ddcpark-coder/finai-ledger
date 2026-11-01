<?php

namespace App\Domain\Accounting;

enum PeriodStatus: string
{
    case Open = 'open';
    case Locked = 'locked';
}
