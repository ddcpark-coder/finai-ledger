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
    // NEXT32: Windows ACK signing is also disabled by default; NEVER production.
    'synthetic_windows_ack_enabled' => (bool) env('FINAI_SYNTHETIC_WINDOWS_ACK_ENABLED', false),
    // Private RSA key path: only under backend/storage/app/finai-next32-signing.
    // Provision out-of-band ONLY in isolated local/testing, never in GitHub.
    'synthetic_windows_ack_private_key_path' => env('FINAI_SYNTHETIC_WINDOWS_ACK_PRIVATE_KEY_PATH', ''),
    // Double gate: controller also refuses every non-local/non-testing environment.
    'synthetic_ledger_scenario_enabled' => (bool) env('FINAI_SYNTHETIC_LEDGER_SCENARIO_ENABLED', false),
    // NEXT26: real-schema synthetic draft preview; local/testing ONLY and off by default.
    'synthetic_journal_preview_enabled' => (bool) env('FINAI_SYNTHETIC_JOURNAL_PREVIEW_ENABLED', false),
    // NEXT29: test/local only, human-reviewed synthetic invoice-to-draft workflow.
    'synthetic_approved_invoice_workflow_enabled' => (bool) env('FINAI_SYNTHETIC_APPROVED_INVOICE_WORKFLOW_ENABLED', false),
    // No public endpoint: application-layer synthetic commerce staging, local/testing only.
    'synthetic_commerce_staging_enabled' => (bool) env('FINAI_SYNTHETIC_COMMERCE_STAGING_ENABLED', false),
    // NEXT22 unified multi-tenant, synthetic-only business read model and stock
    // plans. OFF by default, requires commerce+CRM test flags and local/testing.
    'synthetic_business_graph_enabled' => (bool) env('FINAI_SYNTHETIC_BUSINESS_GRAPH_ENABLED', false),
    // Optional LOCAL/TESTING persistent synthetic CRM demo; off by default.
    'synthetic_crm_persistence_enabled' => (bool) env('FINAI_SYNTHETIC_CRM_PERSISTENCE_ENABLED', false),
];
