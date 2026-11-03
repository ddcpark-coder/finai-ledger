<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('units_of_measure', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 20);
            $table->string('name');
            $table->unsignedTinyInteger('decimal_places')->default(2);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'code']);
        });

        Schema::create('product_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('product_categories')->nullOnDelete();
            $table->string('name');
            $table->string('code', 50)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['company_id', 'parent_id', 'active']);
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('unit_of_measure_id')->constrained();
            $table->foreignId('tax_code_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('revenue_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('expense_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->string('type', 20)->default('product');
            $table->string('sku', 80);
            $table->string('barcode', 80)->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->decimal('purchase_price', 18, 4)->nullable();
            $table->decimal('sales_price', 18, 4)->nullable();
            $table->decimal('min_sales_price', 18, 4)->nullable();
            $table->decimal('default_discount_percent', 7, 4)->default(0);
            $table->boolean('track_inventory')->default(false);
            $table->decimal('min_stock_level', 18, 4)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'sku']);
            $table->index(['company_id', 'type', 'active']);
            $table->index(['company_id', 'barcode']);
        });

        Schema::create('price_lists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('currency', 3)->default('EUR');
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedInteger('priority')->default(100);
            $table->timestamps();

            $table->index(['company_id', 'active', 'priority']);
        });

        Schema::create('price_list_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('price_list_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('price', 18, 4);
            $table->decimal('discount_percent', 7, 4)->default(0);
            $table->decimal('min_quantity', 18, 4)->default(1);
            $table->timestamps();

            $table->unique(['price_list_id', 'product_id', 'min_quantity'], 'price_list_product_qty_unique');
        });

        Schema::create('partner_price_lists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->foreignId('price_list_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['partner_id', 'price_list_id']);
        });

        Schema::create('product_suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->string('supplier_sku', 100)->nullable();
            $table->decimal('purchase_price', 18, 4)->nullable();
            $table->unsignedInteger('lead_time_days')->nullable();
            $table->boolean('preferred')->default(false);
            $table->timestamps();

            $table->unique(['product_id', 'partner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_suppliers');
        Schema::dropIfExists('partner_price_lists');
        Schema::dropIfExists('price_list_items');
        Schema::dropIfExists('price_lists');
        Schema::dropIfExists('products');
        Schema::dropIfExists('product_categories');
        Schema::dropIfExists('units_of_measure');
    }
};
