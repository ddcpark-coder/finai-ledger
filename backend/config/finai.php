<?php

return [
    // Intentionally disabled until the real Hiper M environment passes 2FA and CSRF QA.
    'auth_release_enabled' => (bool) env('FINAI_AUTH_RELEASE_ENABLED', false),
    // Isolated synthetic-only API, off in every deployed environment by default.
    'demo_workflows_enabled' => (bool) env('FINAI_DEMO_WORKFLOWS_ENABLED', false),
    // Test-only internal encrypted samples; no controller or public route.
    'synthetic_document_vault_enabled' => (bool) env('FINAI_SYNTHETIC_VAULT_ENABLED', false),
    // Disabled by default AND forbidden outside local/testing, even if misconfigured.
    'synthetic_receipt_sync_enabled' => (bool) env('FINAI_SYNTHETIC_RECEIPT_SYNC_ENABLED', false),
    // Double gate: controller also refuses every non-local/non-testing environment.
    'synthetic_ledger_scenario_enabled' => (bool) env('FINAI_SYNTHETIC_LEDGER_SCENARIO_ENABLED', false),
];
