<?php

namespace App\Application\Preferences;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

final class UserAdaptiveViews
{
    // Existing workspace_layouts table is scoped by (company,user,workspace_key).
    // A stable hash fits its workspace_key(80) constraint without leaking view text.
    private function key(string $moduleKey, string $viewKey): string
    {
        return 'adaptive:'.hash('sha256', $moduleKey."\x1f".$viewKey);
    }

    private function authorize(int $userId, int $companyId): void
    {
        $user = User::findOrFail($userId);
        abort_unless(Gate::forUser($user)->allows('company.access', $companyId),
            403, 'Company access denied.');
    }

    public function read(int $userId, int $companyId, string $moduleKey, string $viewKey): array
    {
        $this->authorize($userId, $companyId);

        $row=DB::table('workspace_layouts')
            ->where('user_id', $userId)
            ->where('company_id', $companyId)
            ->where('workspace_key', $this->key($moduleKey, $viewKey))
            ->first();

        return [
            'version' => (int) ($row?->version ?? 0),
            'settings' => $row?->layout_json
                ? json_decode($row->layout_json, true, 512, JSON_THROW_ON_ERROR)
                : null,
            'updated_at' => $row?->updated_at,
        ];
    }

    public function save(
        int $userId, int $companyId, string $moduleKey, string $viewKey, array $input
    ): array {
        $this->authorize($userId, $companyId);
        $key=$this->key($moduleKey, $viewKey);

        return DB::transaction(function () use ($userId, $companyId, $moduleKey, $viewKey, $key, $input): array {
            DB::table('workspace_layouts')->insertOrIgnore([
                'user_id'=>$userId,
                'company_id'=>$companyId,
                'workspace_key'=>$key,
                'layout_json'=>'{}',
                'version'=>0,
                'created_at'=>now(),
                'updated_at'=>now(),
            ]);

            $current=DB::table('workspace_layouts')
                ->where('user_id', $userId)
                ->where('company_id', $companyId)
                ->where('workspace_key', $key)
                ->lockForUpdate()->first();

            abort_unless($current, 500, 'Adaptive window profile could not be created.');
            abort_unless((int)$current->version === (int)$input['expected_version'],
                409, 'Window settings were changed in another session.');

            DB::table('workspace_layouts')
                ->where('id', $current->id)
                ->update([
                    'layout_json'=>json_encode([
                        'level'=>$input['level'],
                        'arrangement'=>$input['arrangement'],
                        'paneOrder'=>$input['paneOrder'],
                        'formDensity'=>$input['formDensity'] ?? 'comfortable',
                        'detailWidth'=>$input['detailWidth'],
                        'textScale'=>$input['textScale'],
                    ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'version'=>(int)$current->version+1,
                    'updated_at'=>now(),
                ]);

            return $this->read($userId, $companyId, $moduleKey, $viewKey);
        });
    }
}
