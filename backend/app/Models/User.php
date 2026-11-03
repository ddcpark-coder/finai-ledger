<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Illuminate\Support\Facades\DB;

final class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, Notifiable, MustVerifyEmailTrait, TwoFactorAuthenticatable;

    protected $fillable = ['name','email','password','locale','active'];
    protected $hidden = [
        'password','remember_token','two_factor_secret','two_factor_recovery_codes'
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'active' => 'boolean',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function requiresTwoFactor(): bool
    {
        // Privilege check is company membership scoped, not a browser-provided role.
        return DB::table('company_user as membership')
            ->join('companies', 'companies.id', '=', 'membership.company_id')
            ->join('roles', 'roles.id', '=', 'membership.role_id')
            ->where('membership.user_id', $this->getKey())
            ->where('membership.status', 'active')
            ->where('companies.active', true)
            ->whereIn('roles.key', ['owner', 'admin'])
            ->exists();
    }

    public function companies(): BelongsToMany
    {
        return $this->belongsToMany(Company::class, 'company_user')
            ->withPivot(['role_id','status','joined_at','invited_by'])
            ->withTimestamps();
    }
}
