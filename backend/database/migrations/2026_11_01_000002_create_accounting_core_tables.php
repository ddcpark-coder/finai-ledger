<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('status', 20)->default('open');
            $table->timestamps();
            $table->unique(['company_id', 'year']);
        });

        Schema::create('accounting_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiscal_year_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('period_no');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('status', 20)->default('open');
            $table->timestamp('locked_at')->nullable();
            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['fiscal_year_id', 'period_no']);
        });

        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 32);
            $table->string('name');
            $table->string('type', 30);
            $table->boolean('postable')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('requires_open_item')->default(false);
            $table->timestamps();
            $table->unique(['company_id', 'code']);
        });

        Schema::create('cost_centers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 32);
            $table->string('name');
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['company_id', 'code']);
        });

        Schema::create('tax_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 40);
            $table->string('name');
            $table->decimal('rate', 7, 4)->default(0);
            $table->string('direction', 20)->default('neutral');
            $table->json('metadata')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['company_id', 'code']);
        });

        Schema::create('journals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fiscal_year_id')->constrained();
            $table->foreignId('accounting_period_id')->constrained();
            $table->string('number', 50);
            $table->date('posting_date');
            $table->date('document_date')->nullable();
            $table->string('document_ref', 100)->nullable();
            $table->string('description');
            $table->string('status', 20)->default('draft');
            $table->foreignId('reversal_of_id')->nullable()->constrained('journals')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();
            $table->unique(['company_id', 'number']);
            $table->index(['company_id', 'posting_date', 'status']);
        });

        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('line_no');
            $table->foreignId('account_id')->constrained();
            $table->foreignId('cost_center_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('tax_code_id')->nullable()->constrained()->nullOnDelete();
            $table->string('counterparty_ref', 100)->nullable();
            $table->string('open_item_ref', 100)->nullable();
            $table->string('description')->nullable();
            $table->decimal('debit', 18, 2)->default(0);
            $table->decimal('credit', 18, 2)->default(0);
            $table->timestamps();
            $table->unique(['journal_id', 'line_no']);
            $table->index(['account_id', 'open_item_ref']);
        });

        Schema::create('open_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->constrained();
            $table->foreignId('source_journal_entry_id')->constrained('journal_entries');
            $table->string('counterparty_ref', 100)->nullable();
            $table->string('reference', 100);
            $table->date('due_date')->nullable();
            $table->decimal('original_amount', 18, 2);
            $table->decimal('open_amount', 18, 2);
            $table->string('currency', 3)->default('EUR');
            $table->string('status', 20)->default('open');
            $table->timestamps();
            $table->index(['company_id', 'status', 'due_date']);
            $table->unique(['company_id', 'account_id', 'reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('open_items');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('journals');
        Schema::dropIfExists('tax_codes');
        Schema::dropIfExists('cost_centers');
        Schema::dropIfExists('accounts');
        Schema::dropIfExists('accounting_periods');
        Schema::dropIfExists('fiscal_years');
    }
};
