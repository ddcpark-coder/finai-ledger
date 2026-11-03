<?php

namespace App\Http\Controllers\Api;

use App\Application\Preferences\UserWorkspacePreferences;
use App\Http\Controllers\Controller;
use App\Http\Requests\SaveWorkspacePreferencesRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class WorkspacePreferencesController extends Controller
{
    public function show(Request $request, int $companyId, UserWorkspacePreferences $service): JsonResponse
    {
        return response()->json(['data'=>$service->read((int)$request->user()->id,$companyId)])
            ->header('Cache-Control','private, no-store');
    }

    public function update(SaveWorkspacePreferencesRequest $request,int $companyId,UserWorkspacePreferences $service): JsonResponse
    {
        $preferences=$service->save((int)$request->user()->id,$companyId,$request->validated());
        return response()->json(['data'=>$preferences])->header('Cache-Control','private, no-store');
    }
}
