<?php

namespace App\Http\Controllers\Api;

use App\Application\Preferences\UserAdaptiveViews;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class AdaptiveWindowPreferencesController extends Controller
{
    private function viewKey(Request $request, string $moduleKey): string
    {
        abort_unless(array_key_exists($moduleKey, config('modules', [])), 404);
        $input=$request->validate([
            'view'=>['required','string','min:1','max:160',
                'regex:/\A[^\x00-\x1F]+\z/u'],
        ]);
        return $input['view'];
    }

    public function show(Request $request, int $companyId, string $moduleKey,
        UserAdaptiveViews $service): JsonResponse
    {
        $viewKey=$this->viewKey($request, $moduleKey);
        return response()->json(['data'=>$service->read(
            (int)$request->user()->id, $companyId, $moduleKey, $viewKey
        )])->header('Cache-Control','private, no-store');
    }

    public function update(Request $request, int $companyId, string $moduleKey,
        UserAdaptiveViews $service): JsonResponse
    {
        $viewKey=$this->viewKey($request, $moduleKey);
        $input=$request->validate([
            'expected_version'=>['required','integer','min:0','max:2147483646'],
            'level'=>['required', Rule::in(['simple','standard','expert'])],
            'arrangement'=>['required', Rule::in(['split','stacked','list','detail'])],
            'detailWidth'=>['required','integer','between:260,700'],
            'textScale'=>['required','integer', Rule::in([100,115,130])],
        ]);

        return response()->json(['data'=>$service->save(
            (int)$request->user()->id, $companyId, $moduleKey, $viewKey, $input
        )])->header('Cache-Control','private, no-store');
    }
}
