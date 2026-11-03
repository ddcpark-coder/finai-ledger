<?php

namespace App\Application\Modules;

use Illuminate\Support\Facades\Cache;

final class ResolveEnabledModules
{
    public function execute(int $companyId, array $permissions, array $companyOverrides = []): array
    {
        $cacheKey = 'modules:company:'.$companyId.':'.sha1(json_encode([$permissions, $companyOverrides]));

        return Cache::remember($cacheKey, now()->addMinutes(15), function () use ($permissions, $companyOverrides) {
            $modules = config('modules', []);
            $enabled = [];

            foreach ($modules as $key => $module) {
                $isEnabled = $companyOverrides[$key] ?? ($module['default_enabled'] ?? false);
                if (! $isEnabled) {
                    continue;
                }

                $permission = $module['permission'] ?? null;
                if ($permission && ! in_array($permission, $permissions, true)) {
                    continue;
                }

                $enabled[] = [
                    'key' => $key,
                    'group' => $module['group'] ?? 'other',
                ];
            }

            return $enabled;
        });
    }
}
