<?php

return [
    // Intentionally disabled until the real Hiper M environment passes 2FA and CSRF QA.
    'auth_release_enabled' => (bool) env('FINAI_AUTH_RELEASE_ENABLED', false),
];
