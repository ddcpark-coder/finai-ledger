<?php

namespace App\Http\Controllers\Api;

use App\Application\Documents\SyntheticReceiptSync;
use App\Application\Documents\SyntheticWindowsAckSigner;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

final class SyntheticReceiptSyncController extends Controller
{
    public function show(Request $request, int $companyId, string $documentId,
        SyntheticReceiptSync $sync): JsonResponse
    {
        return response()->json(['data' => $sync->status(
            (int) $request->user()->id, $companyId, $documentId
        )])->header('Cache-Control', 'private, no-store');
    }

    public function latest(Request $request, int $companyId, string $documentId,
        SyntheticReceiptSync $sync): JsonResponse
    {
        return response()->json(['data' => $sync->latest(
            (int) $request->user()->id, $companyId, $documentId
        )])->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request, int $companyId, string $documentId,
        SyntheticReceiptSync $sync, SyntheticWindowsAckSigner $signer): JsonResponse
    {
        $data = $request->validate([
            'client_event_id' => ['required', 'uuid'],
            'expected_version' => ['required', 'integer', 'min:0', 'max:2147483646'],
            'envelope' => ['required',
                'array:format,companyId,documentId,version,iterations,salt,iv,ciphertext'],
            'envelope.format' => ['required', Rule::in([
                'finai-mobile-synthetic-vault-v1',
                'finai-windows-synthetic-outbox-v1',
            ])],
            'envelope.companyId' => ['required', 'integer'],
            'envelope.documentId' => ['required', 'string', 'max:64'],
            'envelope.version' => ['required', 'integer', Rule::in([1])],
            'envelope.iterations' => ['required', 'integer', Rule::in([250000])],
            'envelope.salt' => ['required', 'string', 'size:24',
                'regex:/\A[A-Za-z0-9+\/]+={0,2}\z/D'],
            'envelope.iv' => ['required', 'string', 'size:16',
                'regex:/\A[A-Za-z0-9+\/]+={0,2}\z/D'],
            'envelope.ciphertext' => ['required', 'string', 'min:64', 'max:220000',
                'regex:/\A[A-Za-z0-9+\/]+={0,2}\z/D'],
        ]);
        $isWindows = $data['envelope']['format'] === 'finai-windows-synthetic-outbox-v1';
        if ($isWindows) {
            // Must be configured BEFORE any synthetic DB write; production
            // or missing/private-key failures deny the entire Windows request.
            $signer->assertAvailable();
        }

        $result = DB::transaction(function () use ($request, $companyId,
            $documentId, $data, $sync, $signer, $isWindows): array {
            $ack = $sync->accept(
                (int) $request->user()->id, $companyId, $documentId,
                $data['client_event_id'], $data['expected_version'], $data['envelope']
            );
            if ($isWindows) {
                $ack['signed_windows_ack'] = $signer->sign(
                    (int) $request->user()->id, $companyId, $documentId,
                    $data['client_event_id'], $data['expected_version'],
                    $data['envelope']
                );
            }
            return $ack;
        });
        return response()->json(['data' => $result])
            ->header('Cache-Control', 'private, no-store');
    }
}
