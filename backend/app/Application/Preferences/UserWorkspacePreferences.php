<?php

namespace App\Application\Preferences;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

final class UserWorkspacePreferences
{
    private function authorize(int $userId, int $companyId): void
    {
        $user = User::findOrFail($userId);
        abort_unless(
            Gate::forUser($user)->allows('company.access', $companyId),
            403,
            'Company access denied.'
        );
    }

    public function read(int $userId, int $companyId): array
    {
        $this->authorize($userId, $companyId);

        $row=DB::table('user_workspace_preferences')
            ->where('user_id', $userId)
            ->where('company_id', $companyId)
            ->first();

        return [
            'version' => (int) ($row?->version ?? 0),
            'last_route' => $row?->last_route ? json_decode($row->last_route, true) : null,
            'favorites' => $row?->favorites ? json_decode($row->favorites, true) : [],
            'appearance' => $row?->appearance ? json_decode($row->appearance, true) : [],
            'updated_at' => $row?->updated_at,
        ];
    }

    public function save(int $userId, int $companyId, array $input): array
    {
        $this->authorize($userId, $companyId);

        return DB::transaction(function () use ($userId, $companyId, $input): array {
            // Atomic creation protects the first write from concurrent tabs/devices.
            DB::table('user_workspace_preferences')->insertOrIgnore([
                'user_id' => $userId,
                'company_id' => $companyId,
                'last_route' => null,
                'favorites' => '[]',
                'appearance' => '{}',
                'version' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $current = DB::table('user_workspace_preferences')
                ->where('user_id', $userId)
                ->where('company_id', $companyId)
                ->lockForUpdate()
                ->first();

            abort_unless($current, 500, 'Workspace preferences could not be created.');

            if ((int) $input['expected_version'] !== (int) $current->version) {
                abort(409, 'Workspace preferences were modified in another session.');
            }

            DB::table('user_workspace_preferences')
                ->where('id', $current->id)
                ->update([
                    'last_route' => json_encode($input['last_route'] ?? null, JSON_UNESCAPED_UNICODE),
                    'favorites' => json_encode($input['favorites'] ?? [], JSON_UNESCAPED_UNICODE),
                    'appearance' => json_encode($input['appearance'] ?? [], JSON_UNESCAPED_UNICODE),
                    'version' => $current->version + 1,
                    'updated_at' => now(),
                ]);

            return $this->read($userId, $companyId);
        });
    }
}
