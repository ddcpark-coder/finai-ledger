<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->constrained();
            $table->foreignId('opportunity_id')->nullable()->constrained('crm_opportunities')->nullOnDelete();
            $table->string('number', 80);
            $table->unsignedInteger('version')->default(1);
            $table->string('status', 30)->default('draft');
            $table->date('issue_date');
            $table->date('valid_until')->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->decimal('net_amount', 18, 2)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('gross_amount', 18, 2)->default(0);
            $table->text('notes')->nullable();
            $table->string('public_token_hash', 64)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['company_id', 'number', 'version']);
            $table->index(['company_id', 'status', 'valid_until']);
            $table->index(['partner_id', 'status']);
        });

        Schema::create('quote_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('line_no');
            $table->string('description');
            $table->decimal('quantity', 18, 4)->default(1);
            $table->string('unit', 20);
            $table->decimal('unit_price', 18, 4);
            $table->decimal('discount_percent', 7, 4)->default(0);
            $table->decimal('net_amount', 18, 2);
            $table->decimal('tax_rate', 7, 4)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('gross_amount', 18, 2);
            $table->foreignId('tax_code_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->unique(['quote_id', 'line_no']);
        });

        Schema::create('quote_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained()->cascadeOnDelete();
            $table->string('event_type', 40);
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['quote_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quote_events');
        Schema::dropIfExists('quote_lines');
        Schema::dropIfExists('quotes');
    }
};
