<?php

namespace App\Domain\IncomingInvoices;

enum IncomingInvoiceStatus: string
{
    case Received = 'received';
    case Processing = 'processing';
    case Review = 'review';
    case Approved = 'approved';
    case Posted = 'posted';
    case Rejected = 'rejected';
    case Failed = 'failed';
}
