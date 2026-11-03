<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('finai:info', function (): void {
    $this->info('FinAI Ledger Laravel API bootstrap');
})->purpose('Report the FinAI backend bootstrap identity');
