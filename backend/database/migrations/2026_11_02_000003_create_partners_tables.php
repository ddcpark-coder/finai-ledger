<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('partners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20)->default('company');
            $table->string('name');
            $table->string('short_name')->nullable();
            $table->string('registration_number', 64)->nullable();
            $table->string('tax_number', 32)->nullable();
            $table->string('vat_id', 32)->nullable();
            $table->boolean('vat_registered')->default(false);
            $table->char('country_code', 2)->default('SI');
            $table->string('currency', 3)->default('EUR');
            $table->unsignedSmallInteger('payment_terms_days')->default(15);
            $table->string('status', 20)->default('active');
            $table->string('risk_level', 20)->default('normal');
            $table->timestamp('verified_at')->nullable();
            $table->string('verification_source', 30)->nullable();
            $table->timestamps();

            $table->index(['company_id', 'name']);
            $table->index(['company_id', 'tax_number']);
            $table->index(['company_id', 'vat_id']);
        });

        Schema::create('partner_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20)->default('registered');
            $table->string('street');
            $table->string('postal_code', 20);
            $table->string('city');
            $table->char('country_code', 2)->default('SI');
            $table->boolean('primary')->default(false);
            $table->timestamps();
        });

        Schema::create('partner_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('role')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->boolean('primary')->default(false);
            $table->timestamps();
        });

        Schema::create('partner_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->string('iban', 34);
            $table->string('bic', 11)->nullable();
            $table->string('bank_name')->nullable();
            $table->boolean('primary')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['partner_id', 'iban']);
        });

        Schema::create('partner_account_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('receivable_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('payable_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->timestamps();

            $table->unique('partner_id');
        });

        Schema::table('open_items', function (Blueprint $table) {
            $table->foreignId('partner_id')->nullable()->after('company_id')->constrained()->nullOnDelete();
            $table->index(['company_id', 'partner_id', 'status']);
        });

        Schema::table('journal_entries', function (Blueprint $table) {
            $table->foreignId('partner_id')->nullable()->after('account_id')->constrained()->nullOnDelete();
            $table->index(['partner_id', 'open_item_ref']);
        });
    }

    public function down(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropForeign(['partner_id']);
            $table->dropIndex(['partner_id', 'open_item_ref']);
            $table->dropColumn('partner_id');
        });

        Schema::table('open_items', function (Blueprint $table) {
            $table->dropForeign(['partner_id']);
            $table->dropIndex(['company_id', 'partner_id', 'status']);
            $table->dropColumn('partner_id');
        });

        Schema::dropIfExists('partner_account_mappings');
        Schema::dropIfExists('partner_bank_accounts');
        Schema::dropIfExists('partner_contacts');
        Schema::dropIfExists('partner_addresses');
        Schema::dropIfExists('partners');
    }
};
