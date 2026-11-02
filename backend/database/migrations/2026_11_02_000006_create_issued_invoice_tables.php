<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('invoice_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('key', 40);
            $table->string('prefix', 30)->nullable();
            $table->unsignedSmallInteger('year');
            $table->unsignedBigInteger('next_number')->default(1);
            $table->unsignedTinyInteger('padding')->default(4);
            $table->timestamps();
            $table->unique(['company_id', 'key', 'year']);
        });

        Schema::create('issued_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->constrained();
            $table->foreignId('journal_id')->nullable()->constrained('journals')->nullOnDelete();
            $table->string('number', 80)->nullable();
            $table->string('status', 30)->default('draft');
            $table->date('issue_date')->nullable();
            $table->date('service_date')->nullable();
            $table->date('due_date')->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->decimal('net_amount', 18, 2)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('gross_amount', 18, 2)->default(0);
            $table->string('delivery_method', 30)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('external_ref', 100)->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('issued_at')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'number']);
            $table->index(['company_id', 'status', 'due_date']);
            $table->index(['partner_id', 'status']);
        });

        Schema::create('issued_invoice_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issued_invoice_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('line_no');
            $table->string('description');
            $table->decimal('quantity', 18, 4)->default(1);
            $table->decimal('unit_price', 18, 4);
            $table->decimal('discount_percent', 7, 4)->default(0);
            $table->decimal('net_amount', 18, 2);
            $table->decimal('tax_rate', 7, 4)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('gross_amount', 18, 2);
            $table->foreignId('tax_code_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('revenue_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('cost_center_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
            $table->unique(['issued_invoice_id', 'line_no']);
        });

        Schema::create('invoice_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issued_invoice_id')->constrained()->cascadeOnDelete();
            $table->string('channel', 30);
            $table->string('recipient')->nullable();
            $table->string('status', 30)->default('queued');
            $table->string('provider_message_id')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('attempted_at')->nullable();
            $table->timestamps();

            $table->index(['issued_invoice_id', 'status']);
        });

        Schema::create('invoice_artifacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issued_invoice_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 30);
            $table->string('format', 20);
            $table->string('storage_disk', 40);
            $table->string('storage_path');
            $table->string('sha256', 64);
            $table->timestamps();

            $table->index(['issued_invoice_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_artifacts');
        Schema::dropIfExists('invoice_deliveries');
        Schema::dropIfExists('issued_invoice_lines');
        Schema::dropIfExists('issued_invoices');
        Schema::dropIfExists('invoice_sequences');
    }
};
