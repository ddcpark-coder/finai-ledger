<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class Company extends Model
{
    protected $fillable = ['name','tax_number','country_code','active'];

    protected function casts(): array
    {
        return ['active'=>'boolean'];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'company_user')
            ->withPivot(['role_id','status','joined_at','invited_by'])
            ->withTimestamps();
    }
}
