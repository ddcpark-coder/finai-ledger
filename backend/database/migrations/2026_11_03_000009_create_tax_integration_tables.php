<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tax_integration_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 30)->default('edavki');
            $table->string('environment', 10)->default('test');
            $table->string('taxpayer_number', 32);
            $table->string('certificate_reference')->nullable();
            $table->string('certificate_fingerprint', 128)->nullable();
            $table->timestamp('certificate_valid_to')->nullable();
            $table->boolean('active')->default(false);
            $table->timestamps();

            $table->unique(['company_id', 'provider', 'environment'], 'tax_profile_company_provider_env');
        });

        Schema::create('tax_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tax_integration_profile_id')->constrained()->cascadeOnDelete();
            $table->string('document_type', 50);
            $table->string('source_type', 50);
            $table->unsignedBigInteger('source_id');
            $table->string('environment', 10);
            $table->string('idempotency_key', 128);
            $table->unsignedInteger('attempt_no')->default(0);
            $table->string('status', 30)->default('prepared');
            $table->string('remote_document_id', 150)->nullable();
            $table->string('remote_status', 80)->nullable();
            $table->string('artifact_sha256', 64);
            $table->string('artifact_path');
            $table->json('last_response_meta')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('last_checked_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['company_id', 'idempotency_key']);
            $table->index(['company_id', 'status', 'environment']);
            $table->index(['remote_document_id', 'environment']);
        });

        Schema::create('tax_submission_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_submission_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('attempt_no');
            $table->string('operation', 30);
            $table->string('status', 20);
            $table->unsignedInteger('http_status')->nullable();
            $table->string('soap_fault_code', 120)->nullable();
            $table->text('message')->nullable();
            $table->json('response_meta')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->unique(['tax_submission_id', 'attempt_no', 'operation'], 'tax_attempt_unique');
        });

        Schema::create('tax_submission_status_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_submission_id')->constrained()->cascadeOnDelete();
            $table->string('remote_status', 80);
            $table->string('local_status', 30);
            $table->json('payload_meta')->nullable();
            $table->timestamp('observed_at');
            $table->timestamps();

            $table->index(['tax_submission_id', 'observed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_submission_status_events');
        Schema::dropIfExists('tax_submission_attempts');
        Schema::dropIfExists('tax_submissions');
        Schema::dropIfExists('tax_integration_profiles');
    }
};
