<?php

namespace App\Application\Preferences;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

final class UserWorkspacePreferences
{
    private function authorize(int $userId, int $companyId): void
    {
        // Fail closed. Bind 'company.access' in the real Identity provider before enabling routes.
        abort_unless(Gate::forUser(\App\Models\User::findOrFail($userId))
            ->allows('company.access', $companyId), 403, 'Company access denied');
    }

    public function read(int $userId, int $companyId): array
    {
        $this->authorize($userId, $companyId);
        $row=DB::table('user_workspace_preferences')->where('user_id',$userId)
            ->where('company_id',$companyId)->first();
        return [
            'version'=>(int)($row?->version??0),
            'last_route'=>$row?->last_route ? json_decode($row->last_route,true) : null,
            'favorites'=>$row?->favorites ? json_decode($row->favorites,true) : [],
            'appearance'=>$row?->appearance ? json_decode($row->appearance,true) : [],
            'updated_at'=>$row?->updated_at,
        ];
    }

    public function save(int $userId,int $companyId,array $input): array
    {
        $this->authorize($userId,$companyId);

        return DB::transaction(function () use ($userId,$companyId,$input) {
            $current=DB::table('user_workspace_preferences')
                ->where('user_id',$userId)->where('company_id',$companyId)->lockForUpdate()->first();

            if ($current && isset($input['expected_version']) &&
                (int)$input['expected_version'] !== (int)$current->version) {
                abort(409,'Workspace preferences were modified in another session');
            }

            $nextVersion=$current?(int)$current->version+1:1;
            $payload=[
                'last_route'=>json_encode($input['last_route']??null,JSON_UNESCAPED_UNICODE),
                'favorites'=>json_encode($input['favorites']??[],JSON_UNESCAPED_UNICODE),
                'appearance'=>json_encode($input['appearance']??[],JSON_UNESCAPED_UNICODE),
                'version'=>$nextVersion,
                'updated_at'=>now(),
            ];

            if ($current) {
                DB::table('user_workspace_preferences')->where('id',$current->id)->update($payload);
            } else {
                DB::table('user_workspace_preferences')->insert($payload+[
                    'company_id'=>$companyId,'user_id'=>$userId,'created_at'=>now()
                ]);
            }

            return $this->read($userId,$companyId);
        });
    }
}
