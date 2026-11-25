<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * All requests use disposable in-memory SQLite. No Hiper M or remote DB.
 */
final class ApiReadinessTest extends TestCase
{
    public function test_readiness_is_disabled_by_default_and_no_details_are_exposed(): void
    {
        config(['finai.api_readiness_enabled' => false]);

        $response = $this->getJson('/api/readiness')
            ->assertStatus(503)
            ->assertJsonExact(['status' => 'unavailable']);

        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $this->assertStringNotContainsString('sqlite', $response->getContent());
        $this->assertStringNotContainsString('einteg86', $response->getContent());
    }

    public function test_opt_in_readiness_proves_only_database_connectivity(): void
    {
        config(['finai.api_readiness_enabled' => true]);

        $response = $this->getJson('/api/readiness')
            ->assertOk()
            ->assertJsonExact(['status' => 'database-reachable']);

        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_production_cannot_claim_readiness_on_sqlite(): void
    {
        config([
            'finai.api_readiness_enabled' => true,
            'database.default' => 'sqlite',
            'app.debug' => false,
            'session.secure' => true,
        ]);
        app()->instance('env', 'production');

        $this->getJson('/api/readiness')
            ->assertStatus(503)
            ->assertJsonExact(['status' => 'unavailable']);
    }

    public function test_bad_database_connection_fails_closed_without_exception_text(): void
    {
        config([
            'finai.api_readiness_enabled' => true,
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => '/definitely-not-a-database/finai-ci.sqlite',
        ]);
        \Illuminate\Support\Facades\DB::purge('sqlite');

        $response = $this->getJson('/api/readiness')
            ->assertStatus(503)
            ->assertJsonExact(['status' => 'unavailable']);

        $this->assertStringNotContainsString('database', strtolower($response->getContent()));
    }
}
