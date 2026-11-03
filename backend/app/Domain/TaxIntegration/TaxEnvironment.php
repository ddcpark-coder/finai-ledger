<?php

namespace App\Domain\TaxIntegration;

enum TaxEnvironment: string
{
    case Test = 'test';
    case Production = 'production';

    public function endpoint(): string
    {
        return match ($this) {
            self::Test => 'https://beta.edavki.durs.si/SoapPortal/EdpSoapService.asmx',
            self::Production => 'https://edavki.durs.si/SoapPortal/EdpSoapService.asmx',
        };
    }
}
