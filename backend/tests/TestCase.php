<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Only the verified identity+preferences schema is included in this first
        // executable slice. Legacy finance migrations are not production-ready yet.
        $this->artisan('migrate:fresh', [
            '--path' => [
                'database/migrations/2026_11_01_000001_create_identity_access_tables.php',
                'database/migrations/2026_11_03_000018_create_user_workspace_preferences.php',
                'database/migrations/2026_11_11_000019_create_demo_incoming_invoices.php',
                'database/migrations/2026_11_11_000020_create_synthetic_documents.php',
            ],
            '--force' => true,
        ])->run();
    }
}
