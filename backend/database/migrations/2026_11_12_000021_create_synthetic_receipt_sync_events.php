<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('synthetic_receipt_sync_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->uuid('client_event_id');
            $table->string('document_id', 64);
            $table->unsignedInteger('version');
            $table->char('payload_sha256', 64);
            // Opaque client AES-GCM envelope double-encrypted by Laravel;
            // NEVER a publicly served file, signed PDF, or posted accounting entry.
            $table->longText('encrypted_envelope');
            $table->timestamps();
            $table->unique(['company_id', 'user_id', 'client_event_id'], 'synthetic_sync_event_unique');
            $table->unique(['company_id', 'user_id', 'document_id', 'version'], 'synthetic_sync_version_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('synthetic_receipt_sync_events');
    }
};
