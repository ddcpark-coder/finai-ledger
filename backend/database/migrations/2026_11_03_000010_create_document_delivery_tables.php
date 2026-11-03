<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('document_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('document_type', 50);
            $table->string('title');
            $table->string('status', 30)->default('active');
            $table->string('storage_disk', 40);
            $table->string('storage_path');
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('size_bytes');
            $table->string('sha256', 64);
            $table->unsignedInteger('version')->default(1);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['company_id', 'document_type', 'status']);
            $table->unique(['company_id', 'sha256', 'version']);
        });

        Schema::create('document_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_record_id')->constrained()->cascadeOnDelete();
            $table->string('entity_type', 80);
            $table->unsignedBigInteger('entity_id');
            $table->string('relation', 40)->default('attachment');
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
        });

        Schema::create('document_access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_record_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 30);
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('accessed_at');
            $table->timestamps();

            $table->index(['document_record_id', 'accessed_at']);
        });

        Schema::create('delivery_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->constrained();
            $table->string('number', 80)->nullable();
            $table->date('delivery_date');
            $table->string('status', 30)->default('draft');
            $table->string('recipient_name')->nullable();
            $table->string('recipient_email')->nullable();
            $table->text('delivery_address')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'number']);
            $table->index(['company_id', 'status', 'delivery_date']);
        });

        Schema::create('delivery_note_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_note_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('line_no');
            $table->string('item_code', 80)->nullable();
            $table->string('description');
            $table->decimal('quantity', 18, 4);
            $table->string('unit', 20)->default('kos');
            $table->timestamps();

            $table->unique(['delivery_note_id', 'line_no']);
        });

        Schema::create('delivery_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_note_id')->constrained()->cascadeOnDelete();
            $table->string('signer_name');
            $table->string('signer_email')->nullable();
            $table->string('signature_type', 30)->default('drawn');
            $table->string('signature_disk', 40)->nullable();
            $table->string('signature_path')->nullable();
            $table->string('signature_sha256', 64)->nullable();
            $table->timestamp('signed_at');
            $table->ipAddress('ip_address')->nullable();
            $table->string('device_info', 500)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('qualified_signature_reference')->nullable();
            $table->timestamps();

            $table->unique('delivery_note_id');
        });

        Schema::create('document_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_record_id')->constrained()->cascadeOnDelete();
            $table->string('channel', 30)->default('email');
            $table->string('recipient');
            $table->string('status', 30)->default('queued');
            $table->string('provider_message_id')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['document_record_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_deliveries');
        Schema::dropIfExists('delivery_receipts');
        Schema::dropIfExists('delivery_note_lines');
        Schema::dropIfExists('delivery_notes');
        Schema::dropIfExists('document_access_logs');
        Schema::dropIfExists('document_links');
        Schema::dropIfExists('document_records');
    }
};
