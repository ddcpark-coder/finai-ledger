<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

final class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Company ID is ALWAYS authorized against the signed-in user and active membership.
        Gate::define('company.access', function (User $user, int|string $companyId): bool {
            if (! $user->active || ! $user->hasVerifiedEmail()
                || ! ctype_digit((string) $companyId) || (int) $companyId < 1) {
                return false;
            }

            return $user->companies()
                ->whereKey((int) $companyId)
                ->where('companies.active', true)
                ->wherePivot('status', 'active')
                ->exists();
        });
    }
}
