<?php

namespace App\Domain\CRM;

enum OpportunityStage: string
{
    case Qualification = 'qualification';
    case Discovery = 'discovery';
    case Proposal = 'proposal';
    case Negotiation = 'negotiation';
    case Won = 'won';
    case Lost = 'lost';

    public function defaultProbability(): int
    {
        return match ($this) {
            self::Qualification => 10,
            self::Discovery => 30,
            self::Proposal => 60,
            self::Negotiation => 80,
            self::Won => 100,
            self::Lost => 0,
        };
    }
}
