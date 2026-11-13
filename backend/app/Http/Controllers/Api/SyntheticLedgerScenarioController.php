<?php

namespace App\Http\Controllers\Api;

use App\Application\Accounting\SyntheticLedgerScenario;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class SyntheticLedgerScenarioController extends Controller
{
    private function access(Request $request, int $companyId, bool $write): int
    {
        // A misconfigured production flag is insufficient to expose demo posting.
        abort_unless(app()->environment('local', 'testing')
            && config('finai.synthetic_ledger_scenario_enabled', false), 404);
        $user = $request->user();
        abort_unless($user && Gate::forUser($user)->allows('company.access', $companyId), 403);
        if ($write) {
            $authorized = DB::table('company_user as membership')
                ->join('roles as role', 'role.id', '=', 'membership.role_id')
                ->join('permission_role as assignment', 'assignment.role_id', '=', 'role.id')
                ->join('permissions as permission', 'permission.id', '=', 'assignment.permission_id')
                ->where('membership.company_id', $companyId)
                ->where('membership.user_id', $user->id)
                ->where('membership.status', 'active')
                ->where('permission.key', 'accounting.post')->exists();
            abort_unless($authorized, 403);
        }
        return (int) $user->id;
    }

    public function show(Request $request, int $companyId,
        SyntheticLedgerScenario $scenario): JsonResponse
    {
        $userId = $this->access($request, $companyId, false);
        return response()->json(['data' => $scenario->show($companyId, $userId)])
            ->header('Cache-Control', 'private, no-store');
    }

    public function advance(Request $request, int $companyId,
        SyntheticLedgerScenario $scenario): JsonResponse
    {
        $userId = $this->access($request, $companyId, true);
        $input = $request->validate([
            'demo_only' => ['required', 'accepted'],
            'action' => ['required', Rule::in(['reserve', 'deliver', 'invoice', 'reverse_invoice'])],
            'event_id' => ['required', 'uuid'],
            'expected_version' => ['required', 'integer', 'min:0', 'max:3'],
        ]);
        $result = $scenario->apply($companyId, $userId, $input['action'],
            $input['event_id'], $input['expected_version']);
        return response()->json(['data' => $result])
            ->header('Cache-Control', 'private, no-store');
    }
}
