<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('iban', 34);
            $table->string('bic', 11)->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->foreignId('ledger_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'iban']);
        });

        Schema::create('bank_statements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_account_id')->constrained()->cascadeOnDelete();
            $table->string('external_id', 120)->nullable();
            $table->date('statement_date');
            $table->decimal('opening_balance', 18, 2)->nullable();
            $table->decimal('closing_balance', 18, 2)->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->string('source_type', 30)->default('upload');
            $table->string('status', 20)->default('imported');
            $table->timestamps();

            $table->unique(['bank_account_id', 'external_id']);
            $table->index(['bank_account_id', 'statement_date']);
        });

        Schema::create('bank_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_statement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->constrained()->cascadeOnDelete();
            $table->string('external_id', 120)->nullable();
            $table->date('booking_date');
            $table->date('value_date')->nullable();
            $table->decimal('amount', 18, 2);
            $table->string('currency', 3)->default('EUR');
            $table->string('counterparty_name')->nullable();
            $table->string('counterparty_iban', 34)->nullable();
            $table->string('reference', 140)->nullable();
            $table->string('purpose_code', 20)->nullable();
            $table->text('description')->nullable();
            $table->string('status', 20)->default('unmatched');
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('journal_id')->nullable()->constrained('journals')->nullOnDelete();
            $table->timestamps();

            $table->unique(['bank_account_id', 'external_id']);
            $table->index(['bank_account_id', 'booking_date', 'status']);
            $table->index(['partner_id', 'status']);
        });

        Schema::create('bank_transaction_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('open_item_id')->constrained()->cascadeOnDelete();
            $table->decimal('matched_amount', 18, 2);
            $table->decimal('confidence', 5, 2)->nullable();
            $table->string('source', 30)->default('manual');
            $table->foreignId('matched_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('matched_at')->nullable();
            $table->timestamps();

            $table->unique(['bank_transaction_id', 'open_item_id']);
        });

        Schema::create('payment_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bank_account_id')->constrained();
            $table->string('type', 30)->default('sepa_credit_transfer');
            $table->string('status', 20)->default('draft');
            $table->string('currency', 3)->default('EUR');
            $table->decimal('total_amount', 18, 2)->default(0);
            $table->unsignedInteger('payment_count')->default(0);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });

        Schema::create('payment_batch_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_batch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('open_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('recipient_name');
            $table->string('recipient_iban', 34);
            $table->decimal('amount', 18, 2);
            $table->string('currency', 3)->default('EUR');
            $table->string('reference', 140)->nullable();
            $table->string('purpose_code', 20)->nullable();
            $table->string('status', 20)->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_batch_items');
        Schema::dropIfExists('payment_batches');
        Schema::dropIfExists('bank_transaction_matches');
        Schema::dropIfExists('bank_transactions');
        Schema::dropIfExists('bank_statements');
        Schema::dropIfExists('bank_accounts');
    }
};
