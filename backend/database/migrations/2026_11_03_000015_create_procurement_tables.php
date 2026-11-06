<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('purchase_requisitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sales_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('number',80);
            $table->string('status',30)->default('draft');
            $table->date('required_by')->nullable();
            $table->foreignId('requested_by')->constrained('users');
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->unique(['company_id','number']);
            $table->index(['company_id','status','required_by']);
        });

        Schema::create('purchase_requisition_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_requisition_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('line_no');
            $table->string('description');
            $table->decimal('quantity',18,4);
            $table->string('unit',20);
            $table->decimal('target_price',18,4)->nullable();
            $table->timestamps();

            $table->unique(['purchase_requisition_id','line_no'], 'purchase_req_line_number_unique');
        });

        Schema::create('supplier_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_requisition_id')->nullable()->constrained()->nullOnDelete();
            $table->string('number',80);
            $table->string('status',30)->default('draft');
            $table->date('reply_due_on')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['company_id','number']);
            $table->index(['company_id','status','reply_due_on']);
        });

        Schema::create('supplier_request_partners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->string('status',30)->default('invited');
            $table->timestamps();

            $table->unique(['supplier_request_id','partner_id']);
        });

        Schema::create('supplier_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->string('supplier_reference',100)->nullable();
            $table->date('valid_until')->nullable();
            $table->string('currency',3)->default('EUR');
            $table->decimal('net_amount',18,2)->default(0);
            $table->string('status',30)->default('received');
            $table->timestamps();

            $table->index(['supplier_request_id','status']);
        });

        Schema::create('supplier_offer_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_offer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('line_no');
            $table->string('description');
            $table->decimal('quantity',18,4);
            $table->string('unit',20);
            $table->decimal('unit_price',18,4);
            $table->unsignedInteger('lead_time_days')->nullable();
            $table->timestamps();

            $table->unique(['supplier_offer_id','line_no']);
        });

        Schema::create('purchase_order_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedBigInteger('next_number')->default(1);
            $table->timestamps();
            $table->unique(['company_id','year']);
        });

        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->constrained();
            $table->foreignId('supplier_offer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('sales_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('number',80);
            $table->string('status',30)->default('draft');
            $table->date('order_date');
            $table->date('expected_delivery_date')->nullable();
            $table->string('currency',3)->default('EUR');
            $table->decimal('net_amount',18,2)->default(0);
            $table->decimal('tax_amount',18,2)->default(0);
            $table->decimal('gross_amount',18,2)->default(0);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['company_id','number']);
            $table->index(['company_id','status','expected_delivery_date']);
            $table->index(['partner_id','status']);
        });

        Schema::create('purchase_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('line_no');
            $table->string('description');
            $table->decimal('ordered_quantity',18,4);
            $table->decimal('received_quantity',18,4)->default(0);
            $table->string('unit',20);
            $table->decimal('unit_price',18,4);
            $table->decimal('tax_rate',7,4)->default(0);
            $table->decimal('net_amount',18,2);
            $table->decimal('tax_amount',18,2)->default(0);
            $table->decimal('gross_amount',18,2);
            $table->timestamps();

            $table->unique(['purchase_order_id','line_no']);
        });

        Schema::create('goods_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->string('number',80);
            $table->date('received_on');
            $table->string('supplier_delivery_note',100)->nullable();
            $table->string('status',30)->default('received');
            $table->foreignId('received_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['company_id','number']);
            $table->index(['purchase_order_id','received_on']);
        });

        Schema::create('goods_receipt_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('goods_receipt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_order_line_id')->constrained()->cascadeOnDelete();
            $table->decimal('received_quantity',18,4);
            $table->decimal('rejected_quantity',18,4)->default(0);
            $table->string('quality_status',20)->default('accepted');
            $table->timestamps();
        });

        Schema::create('purchase_invoice_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incoming_invoice_id')->constrained()->cascadeOnDelete();
            $table->string('status',30)->default('pending');
            $table->decimal('quantity_variance',18,4)->default(0);
            $table->decimal('price_variance',18,2)->default(0);
            $table->decimal('total_variance',18,2)->default(0);
            $table->json('details_json')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['purchase_order_id','incoming_invoice_id'], 'purchase_invoice_match_unique');
            $table->index(['status','total_variance']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_invoice_matches');
        Schema::dropIfExists('goods_receipt_lines');
        Schema::dropIfExists('goods_receipts');
        Schema::dropIfExists('purchase_order_lines');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('purchase_order_sequences');
        Schema::dropIfExists('supplier_offer_lines');
        Schema::dropIfExists('supplier_offers');
        Schema::dropIfExists('supplier_request_partners');
        Schema::dropIfExists('supplier_requests');
        Schema::dropIfExists('purchase_requisition_lines');
        Schema::dropIfExists('purchase_requisitions');
    }
};
