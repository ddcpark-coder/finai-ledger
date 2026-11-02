<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->string('kind', 40)->default('incoming_invoice');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('size_bytes');
            $table->string('sha256', 64);
            $table->string('storage_disk', 40);
            $table->string('storage_path');
            $table->string('status', 30)->default('uploaded');
            $table->timestamps();

            $table->index(['company_id', 'kind', 'status']);
            $table->unique(['company_id', 'sha256']);
        });

        Schema::create('incoming_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('journal_id')->nullable()->constrained('journals')->nullOnDelete();
            $table->string('invoice_number', 100)->nullable();
            $table->date('issue_date')->nullable();
            $table->date('service_date')->nullable();
            $table->date('due_date')->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->decimal('net_amount', 18, 2)->nullable();
            $table->decimal('tax_amount', 18, 2)->nullable();
            $table->decimal('gross_amount', 18, 2)->nullable();
            $table->string('status', 30)->default('received');
            $table->string('source_type', 30)->default('upload');
            $table->decimal('extraction_confidence', 5, 2)->nullable();
            $table->decimal('accounting_confidence', 5, 2)->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status', 'due_date']);
            $table->index(['company_id', 'partner_id', 'invoice_number']);
        });

        Schema::create('incoming_invoice_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incoming_invoice_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('line_no');
            $table->string('description');
            $table->decimal('quantity', 18, 4)->default(1);
            $table->decimal('unit_price', 18, 4)->nullable();
            $table->decimal('net_amount', 18, 2);
            $table->decimal('tax_rate', 7, 4)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('gross_amount', 18, 2);
            $table->foreignId('tax_code_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('suggested_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('cost_center_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('ai_confidence', 5, 2)->nullable();
            $table->timestamps();

            $table->unique(['incoming_invoice_id', 'line_no']);
        });

        Schema::create('document_extractions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 50);
            $table->string('status', 30)->default('queued');
            $table->json('raw_metadata')->nullable();
            $table->json('extracted_fields')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['document_id', 'status']);
        });

        Schema::create('accounting_proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incoming_invoice_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 50)->default('rules');
            $table->decimal('confidence', 5, 2)->nullable();
            $table->json('proposal_json');
            $table->string('status', 20)->default('proposed');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['incoming_invoice_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_proposals');
        Schema::dropIfExists('document_extractions');
        Schema::dropIfExists('incoming_invoice_lines');
        Schema::dropIfExists('incoming_invoices');
        Schema::dropIfExists('documents');
    }
};
