<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

final class AuthSessionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required','email','max:255'],
            'password' => ['required','string','max:256'],
        ]);

        if (! Auth::attempt([
            'email' => $credentials['email'],
            'password' => $credentials['password'],
            'active' => true,
        ])) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed')
            ]);
        }

        /** @var User $user */
        $user = $request->user();
        if (! $user->hasVerifiedEmail()) {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => 'E-naslov ni potrjen.'
            ]);
        }

        // Role-specific 2FA remains a production release gate.
        $request->session()->regenerate();

        return response()->json(['data'=>[
            'id' => $user->id,
            'name' => $user->name,
        ]])->header('Cache-Control','private, no-store');
    }

    public function destroy(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['ok'=>true])
            ->header('Cache-Control','private, no-store');
    }
}
