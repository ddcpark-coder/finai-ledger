<?php

namespace App\Http\Controllers\Api;

use App\Application\Integrations\CompanyWorkflowAccess;
use App\Application\Integrations\UnifiedSyntheticBusinessGraph;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class UnifiedSyntheticBusinessGraphController extends Controller
{
    private function guard(Request $request, int $companyId, array $permissions): int
    {
        // "production" must remain a 404 even if a feature flag is set there.
        abort_unless(app()->environment('local', 'testing')
            && config('finai.synthetic_business_graph_enabled', false)
            && config('finai.synthetic_commerce_staging_enabled', false)
            && config('finai.synthetic_crm_persistence_enabled', false), 404);

        $user = $request->user();
        abort_unless($user && Gate::forUser($user)->allows('company.access', $companyId), 403);
        try {
            foreach ($permissions as $permission) {
                CompanyWorkflowAccess::requirePermission(
                    $companyId, (int) $user->id, $permission);
            }
        } catch (\DomainException) {
            abort(403);
        }
        return (int) $user->id;
    }

    public function index(Request $request, int $companyId,
        UnifiedSyntheticBusinessGraph $graph): JsonResponse
    {
        $actorId = $this->guard($request, $companyId,
            ['crm.read', 'orders.read', 'inventory.read']);
        $input = $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);
        try {
            $data = $graph->snapshot($companyId, $actorId,
                (int) ($input['limit'] ?? 20));
        } catch (\DomainException) {
            abort(409, 'Synthetic business graph data integrity check failed.');
        }
        return response()->json(['data' => $data])
            ->header('Cache-Control', 'private, no-store');
    }

    public function plan(Request $request, int $companyId,
        UnifiedSyntheticBusinessGraph $graph): JsonResponse
    {
        $actorId = $this->guard($request, $companyId,
            ['inventory.write', 'crm.read', 'orders.read']);
        $request->validate([
            'demoOnly' => ['required', 'accepted'],
            'eventId' => ['required', 'string', 'max:80'],
            'sourceWarehouseId' => ['required', 'integer', 'min:1'],
            'targetWarehouseId' => ['required', 'integer', 'min:1'],
            'commerceOrderId' => ['required', 'integer', 'min:1'],
            'crmDealId' => ['required', 'string', 'max:50'],
            'sku' => ['required', 'string', 'max:64'],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000'],
        ]);
        try {
            // Pass ALL fields so any unknown PII/payment/real-posting fields
            // are rejected by the exact-shape service validator.
            $data = $graph->recordPlan($companyId, $actorId, $request->all());
        } catch (\DomainException) {
            abort(409, 'Synthetic planning command rejected.');
        }
        return response()->json(['data' => $data],
            $data['replayed'] ? 200 : 201)
            ->header('Cache-Control', 'private, no-store');
    }
}
