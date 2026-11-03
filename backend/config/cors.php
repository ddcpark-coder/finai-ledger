<?php

$origins = array_filter(array_map(
    'trim',
    explode(',', (string) env('FINAI_ALLOWED_ORIGINS','http://localhost:3000'))
));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'auth/login', 'auth/logout'],
    'allowed_methods' => ['GET','HEAD','POST','PUT','OPTIONS'],
    'allowed_origins' => array_values($origins),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type','Accept','X-XSRF-TOKEN','X-Requested-With'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
