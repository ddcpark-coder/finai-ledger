<?php

namespace App\Http\Controllers\Api;

use App\Application\Accounting\PreviewSyntheticDraftJournal;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class SyntheticJournalPreviewController extends Controller
{
    public function show(Request $request, int $companyId, int $journalId,
        PreviewSyntheticDraftJournal $preview): JsonResponse
    {
        // Never enable on public Hiper M, regardless of an accidentally set flag.
        abort_unless(app()->environment('local', 'testing')
            && config('finai.synthetic_journal_preview_enabled', false), 404);
        $user = $request->user();
        abort_unless($user && Gate::forUser($user)->allows('company.access', $companyId), 403);
        try {
            $data = $preview->execute($companyId, $journalId, (int) $user->id);
        } catch (\DomainException $error) {
            // Do not reveal tenant IDs, account details or any SQL metadata.
            abort(422, 'Sintetičnega osnutka ni mogoče varno preveriti.');
        }
        return response()->json(['data' => $data])
            ->header('Cache-Control', 'private, no-store');
    }
}
