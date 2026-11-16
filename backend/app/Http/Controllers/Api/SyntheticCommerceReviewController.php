<?php

namespace App\Http\Controllers\Api;

use App\Application\Integrations\CompanyWorkflowAccess;
use App\Application\Integrations\SyntheticCommerceReview;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class SyntheticCommerceReviewController extends Controller
{
    private function guard(int $companyId, int $userId, string $permission): void
    {
        abort_unless(app()->environment(['local', 'testing']) &&
            config('finai.synthetic_commerce_staging_enabled', false), 404);
        try {
            CompanyWorkflowAccess::requirePermission($companyId, $userId, $permission);
        } catch (\DomainException) {
            abort(403);
        }
    }

    public function index(Request $request, int $companyId,
        SyntheticCommerceReview $review): JsonResponse
    {
        $this->guard($companyId, (int) $request->user()->id, 'orders.read');
        $parameters = $request->validate([
            'after_id' => ['sometimes', 'integer', 'min:0'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);
        try {
            $data = $review->list($companyId, (int) $request->user()->id,
                (int) ($parameters['after_id'] ?? 0),
                (int) ($parameters['limit'] ?? 20));
        } catch (\DomainException) {
            abort(409, 'Synthetic review data cannot be displayed.');
        }
        return response()->json(['data' => $data])
            ->header('Cache-Control', 'private, no-store');
    }

    public function decide(Request $request, int $companyId, int $orderId,
        SyntheticCommerceReview $review): JsonResponse
    {
        $this->guard($companyId, (int) $request->user()->id, 'orders.write');
        $parameters = $request->validate([
            'decision' => ['required', 'string', 'in:reviewed,hold'],
        ]);
        try {
            $data = $review->decide($companyId, (int) $request->user()->id,
                $orderId, $parameters['decision']);
        } catch (\DomainException) {
            abort(409, 'Synthetic review decision rejected.');
        }
        return response()->json(['data' => $data])
            ->header('Cache-Control', 'private, no-store');
    }
}
