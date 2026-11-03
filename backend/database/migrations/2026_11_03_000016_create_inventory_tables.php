<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code',40);
            $table->string('name');
            $table->text('address')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('default_receiving')->default(false);
            $table->boolean('default_shipping')->default(false);
            $table->timestamps();

            $table->unique(['company_id','code']);
            $table->index(['company_id','active']);
        });

        Schema::create('warehouse_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->string('code',60);
            $table->string('name')->nullable();
            $table->string('type',30)->default('storage');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['warehouse_id','code']);
            $table->index(['warehouse_id','type','active']);
        });

        Schema::create('inventory_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_location_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('on_hand',18,4)->default(0);
            $table->decimal('reserved',18,4)->default(0);
            $table->decimal('available',18,4)->default(0);
            $table->decimal('incoming',18,4)->default(0);
            $table->decimal('average_cost',18,4)->nullable();
            $table->timestamps();

            $table->unique(['warehouse_id','warehouse_location_id','product_id'],'inventory_balance_unique');
            $table->index(['company_id','product_id','warehouse_id']);
            $table->index(['warehouse_id','available']);
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_location_id')->constrained()->cascadeOnDelete();
            $table->string('movement_type',30);
            $table->decimal('quantity',18,4);
            $table->decimal('unit_cost',18,4)->nullable();
            $table->string('source_type',50);
            $table->unsignedBigInteger('source_id');
            $table->string('reference',120)->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['company_id','product_id','occurred_at']);
            $table->index(['warehouse_id','warehouse_location_id','occurred_at'],'inventory_movement_location_date');
            $table->index(['source_type','source_id']);
        });

        Schema::create('inventory_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sales_order_reservation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('sales_order_line_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_location_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity',18,4);
            $table->string('status',20)->default('active');
            $table->timestamp('reserved_at');
            $table->timestamp('released_at')->nullable();
            $table->timestamps();

            $table->index(['company_id','product_id','status']);
            $table->index(['sales_order_line_id','status']);
        });

        Schema::create('stock_counts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->string('number',80);
            $table->string('status',20)->default('draft');
            $table->date('count_date');
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();

            $table->unique(['company_id','number']);
            $table->index(['warehouse_id','status','count_date']);
        });

        Schema::create('stock_count_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_count_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_location_id')->constrained()->cascadeOnDelete();
            $table->decimal('system_quantity',18,4);
            $table->decimal('counted_quantity',18,4)->nullable();
            $table->decimal('difference',18,4)->nullable();
            $table->timestamps();

            $table->unique(['stock_count_id','product_id','warehouse_location_id'],'stock_count_line_unique');
        });

        Schema::create('inventory_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type',30);
            $table->string('severity',20)->default('warning');
            $table->string('status',20)->default('open');
            $table->json('details_json')->nullable();
            $table->timestamp('detected_at');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['company_id','status','severity']);
            $table->index(['product_id','warehouse_id','type']);
        });

        Schema::table('goods_receipts', function (Blueprint $table) {
            $table->foreignId('warehouse_id')->nullable()->after('purchase_order_id')->constrained()->nullOnDelete();
        });

        Schema::table('delivery_note_lines', function (Blueprint $table) {
            $table->foreignId('sales_order_line_id')->nullable()->after('delivery_note_id')->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->after('sales_order_line_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('delivery_note_lines', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_id');
            $table->dropConstrainedForeignId('sales_order_line_id');
        });
        Schema::table('goods_receipts', fn (Blueprint $table) => $table->dropConstrainedForeignId('warehouse_id'));
        Schema::dropIfExists('inventory_alerts');
        Schema::dropIfExists('stock_count_lines');
        Schema::dropIfExists('stock_counts');
        Schema::dropIfExists('inventory_reservations');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('inventory_balances');
        Schema::dropIfExists('warehouse_locations');
        Schema::dropIfExists('warehouses');
    }
};
