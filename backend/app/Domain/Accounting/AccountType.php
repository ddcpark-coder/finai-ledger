<?php

namespace App\Domain\Accounting;

enum AccountType: string
{
    case Asset = 'asset';
    case Liability = 'liability';
    case Equity = 'equity';
    case Revenue = 'revenue';
    case Expense = 'expense';
    case OffBalance = 'off_balance';
}
