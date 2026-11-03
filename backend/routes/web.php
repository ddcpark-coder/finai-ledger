<?php

use Illuminate\Support\Facades\Route;

// Fortify exclusively owns login, logout, TOTP challenge, recovery and password
// confirmation routes. No duplicate /auth/login endpoint or public registration.
