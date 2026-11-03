<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sales_order_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedBigInteger('next_number')->default(1);
            $table->timestamps();
            $table->unique(['company_id','year']);
        });

        Schema::create('sales_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->constrained();
            $table->foreignId('quote_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('opportunity_id')->nullable()->constrained('crm_opportunities')->nullOnDelete();
            $table->string('number', 80);
            $table->string('status', 30)->default('confirmed');
            $table->date('order_date');
            $table->date('requested_delivery_date')->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->decimal('net_amount', 18, 2)->default(0);
            $table->decimal('tax_amount', 18, 2)->default(0);
            $table->decimal('gross_amount', 18, 2)->default(0);
            $table->text('delivery_address')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['company_id','number']);
            $table->index(['company_id','status','requested_delivery_date']);
            $table->index(['partner_id','status']);
        });

        Schema::create('sales_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('line_no');
            $table->string('description');
            $table->decimal('quantity',18,4);
            $table->decimal('fulfilled_quantity',18,4)->default(0);
            $table->string('unit',20);
            $table->decimal('unit_price',18,4);
            $table->decimal('discount_percent',7,4)->default(0);
            $table->decimal('net_amount',18,2);
            $table->decimal('tax_rate',7,4)->default(0);
            $table->decimal('tax_amount',18,2)->default(0);
            $table->decimal('gross_amount',18,2);
            $table->foreignId('tax_code_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->unique(['sales_order_id','line_no']);
        });

        Schema::create('sales_order_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_line_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity',18,4);
            $table->string('status',20)->default('requested');
            $table->timestamp('reserved_at')->nullable();
            $table->timestamps();

            $table->index(['product_id','status']);
        });

        Schema::create('sales_order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained()->cascadeOnDelete();
            $table->string('event_type',50);
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['sales_order_id','occurred_at']);
        });

        Schema::table('delivery_notes', function (Blueprint $table) {
            $table->foreignId('sales_order_id')->nullable()->after('partner_id')->constrained()->nullOnDelete();
        });

        Schema::table('issued_invoices', function (Blueprint $table) {
            $table->foreignId('sales_order_id')->nullable()->after('partner_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('issued_invoices', fn (Blueprint $table) => $table->dropConstrainedForeignId('sales_order_id'));
        Schema::table('delivery_notes', fn (Blueprint $table) => $table->dropConstrainedForeignId('sales_order_id'));
        Schema::dropIfExists('sales_order_events');
        Schema::dropIfExists('sales_order_reservations');
        Schema::dropIfExists('sales_order_lines');
        Schema::dropIfExists('sales_orders');
        Schema::dropIfExists('sales_order_sequences');
    }
};
