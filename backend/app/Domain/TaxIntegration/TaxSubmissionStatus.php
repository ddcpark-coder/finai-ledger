<?php

namespace App\Domain\TaxIntegration;

enum TaxSubmissionStatus: string
{
    case Prepared = 'prepared';
    case Validated = 'validated';
    case Queued = 'queued';
    case Submitted = 'submitted';
    case Processing = 'processing';
    case Accepted = 'accepted';
    case Rejected = 'rejected';
    case Failed = 'failed';
}
