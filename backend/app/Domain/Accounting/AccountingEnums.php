<?php

namespace App\Domain\Accounting;

enum JournalStatus: string
{
    case Draft = 'draft';
    case Posted = 'posted';
    case Reversed = 'reversed';
}

enum PeriodStatus: string
{
    case Open = 'open';
    case Locked = 'locked';
}

enum AccountType: string
{
    case Asset = 'asset';
    case Liability = 'liability';
    case Equity = 'equity';
    case Revenue = 'revenue';
    case Expense = 'expense';
    case OffBalance = 'off_balance';
}
