<?php

namespace App\Http\Controllers\Api;

use App\Application\CRM\SyntheticCrmPipeline;
use App\Application\Integrations\CompanyWorkflowAccess;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class SyntheticCrmPipelineController extends Controller
{
    private function access(Request $request, int $companyId, bool $write): int
    {
        abort_unless(app()->environment('local', 'testing')
            && config('finai.synthetic_crm_persistence_enabled', false), 404);
        $user = $request->user();
        abort_unless($user && Gate::forUser($user)->allows('company.access', $companyId), 403);

        try {
            CompanyWorkflowAccess::requirePermission(
                $companyId, (int) $user->id, $write ? 'crm.write' : 'crm.read');
        } catch (\DomainException $error) {
            abort(403);
        }
        return (int) $user->id;
    }

    public function index(Request $request, int $companyId,
        SyntheticCrmPipeline $pipeline): JsonResponse
    {
        $userId = $this->access($request, $companyId, false);
        return response()->json([
            'data' => $pipeline->list($companyId, $userId), 'demo_only' => true,
        ])->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request, int $companyId,
        SyntheticCrmPipeline $pipeline): JsonResponse
    {
        $userId = $this->access($request, $companyId, true);
        $request->validate([
            'demoOnly' => ['required', 'boolean'],
            'dealId' => ['required', 'string', 'max:50'],
            'unitCode' => ['required', 'string', 'max:24'],
            'initialStage' => ['required', Rule::in(
                ['qualification', 'discovery', 'proposal', 'negotiation', 'won'])],
            'valueCents' => ['required', 'integer', 'min:1', 'max:10000000000'],
        ]);
        try {
            // Pass unfiltered keys so unknown personal/customer fields are rejected.
            $result = $pipeline->register($companyId, $userId, $request->all());
        } catch (\DomainException $error) {
            abort(409, $error->getMessage());
        }
        return response()->json(['data' => $result, 'demo_only' => true],
            $result['replayed'] ? 200 : 201)
            ->header('Cache-Control', 'private, no-store');
    }

    public function advance(Request $request, int $companyId, string $dealId,
        SyntheticCrmPipeline $pipeline): JsonResponse
    {
        $userId = $this->access($request, $companyId, true);
        $input = $request->validate([
            'demo_only' => ['required', 'accepted'],
            'expected_version' => ['required', 'integer', 'min:1'],
            'next_stage' => ['required', Rule::in(
                ['qualification', 'discovery', 'proposal', 'negotiation', 'won'])],
        ]);
        abort_unless(count($request->all()) === 3, 422);
        try {
            $result = $pipeline->advance($companyId, $userId,
                $dealId, (int) $input['expected_version'], $input['next_stage']);
        } catch (\DomainException $error) {
            abort(409, $error->getMessage());
        }
        return response()->json(['data' => $result, 'demo_only' => true])
            ->header('Cache-Control', 'private, no-store');
    }
}
