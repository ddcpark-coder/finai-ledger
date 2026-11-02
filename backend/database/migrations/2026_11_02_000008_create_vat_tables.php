<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('vat_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('period_key', 20);
            $table->date('starts_on');
            $table->date('ends_on');
            $table->date('filing_due_on')->nullable();
            $table->string('frequency', 20)->default('monthly');
            $table->string('status', 20)->default('open');
            $table->boolean('requires_recaps')->default(false);
            $table->timestamp('locked_at')->nullable();
            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id', 'period_key']);
            $table->index(['company_id', 'status', 'ends_on']);
        });

        Schema::create('vat_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vat_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('tax_code_id')->constrained();
            $table->string('source_type', 30);
            $table->unsignedBigInteger('source_id');
            $table->date('document_date');
            $table->string('document_number', 120)->nullable();
            $table->string('direction', 20);
            $table->decimal('taxable_base', 18, 2)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('deductible_tax_amount', 18, 2)->default(0);
            $table->string('country_code', 2)->default('SI');
            $table->string('partner_vat_id', 32)->nullable();
            $table->json('reporting_tags')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'source_type', 'source_id', 'tax_code_id'], 'vat_entry_source_unique');
            $table->index(['vat_period_id', 'direction']);
            $table->index(['partner_vat_id', 'country_code']);
        });

        Schema::create('vat_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vat_period_id')->constrained()->cascadeOnDelete();
            $table->string('return_type', 30)->default('DDV-O');
            $table->unsignedInteger('version')->default(1);
            $table->string('status', 20)->default('draft');
            $table->json('calculated_fields');
            $table->json('validation_result')->nullable();
            $table->string('artifact_path')->nullable();
            $table->string('artifact_sha256', 64)->nullable();
            $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['vat_period_id', 'return_type', 'version']);
        });

        Schema::create('vat_recap_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vat_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->string('partner_vat_id', 32);
            $table->string('country_code', 2);
            $table->string('transaction_type', 30);
            $table->decimal('amount', 18, 2);
            $table->boolean('correction')->default(false);
            $table->string('correction_period_key', 20)->nullable();
            $table->timestamps();

            $table->index(['vat_period_id', 'country_code', 'partner_vat_id']);
        });

        Schema::create('vat_control_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vat_period_id')->constrained()->cascadeOnDelete();
            $table->string('rule_key', 100);
            $table->string('severity', 20)->default('warning');
            $table->string('status', 20)->default('open');
            $table->string('title');
            $table->text('message');
            $table->json('evidence_json')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['vat_period_id', 'status', 'severity']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vat_control_results');
        Schema::dropIfExists('vat_recap_lines');
        Schema::dropIfExists('vat_returns');
        Schema::dropIfExists('vat_entries');
        Schema::dropIfExists('vat_periods');
    }
};
