<?php

use Laravel\Fortify\Features;

return [
    'guard' => 'web',
    'middleware' => ['web'],
    'passwords' => 'users',
    'username' => 'email',
    'email' => 'email',
    'lowercase_usernames' => true,
    'home' => '/',
    'prefix' => '',
    'domain' => null,
    // Headless; no public registration or password reset routes until they are reviewed.
    'views' => false,
    'limiters' => [
        'login' => 'finai-login',
        'two-factor' => 'finai-two-factor',
    ],
    'features' => [
        Features::twoFactorAuthentication([
            'confirm' => true,
            'confirmPassword' => true,
        ]),
    ],
];
