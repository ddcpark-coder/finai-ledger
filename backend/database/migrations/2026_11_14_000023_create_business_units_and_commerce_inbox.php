<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Schema design only until FinAI has a verified isolated OS/cPanel account.
        Schema::create('business_units', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 24);
            $table->string('name', 120);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['company_id','code']);
        });
        Schema::create('business_unit_warehouses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_unit_id')->constrained('business_units')->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->timestamps();
            $table->unique('warehouse_id'); // One operating unit owns each warehouse.
            $table->index(['company_id','business_unit_id']);
        });
        Schema::create('commerce_connections', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('provider', 24);
            $table->string('status', 16)->default('draft');
            // Deliberately NO secrets/API keys, no webhook URL or user tokens.
            $table->timestamps();
            $table->unique(['company_id','code']);
        });
        Schema::create('commerce_sku_mappings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('connection_id')->constrained('commerce_connections')->cascadeOnDelete();
            $table->string('external_sku', 64);
            $table->string('internal_sku', 64);
            $table->timestamps();
            $table->unique(['connection_id','external_sku']);
            $table->index(['company_id','internal_sku']);
        });
        Schema::create('commerce_order_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('connection_id')->constrained('commerce_connections')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->constrained('users');
            $table->string('event_id', 90);
            $table->string('external_order_id', 90);
            $table->char('fingerprint', 64);
            // Only synthetic, PII-free normalized lines; no customer payload.
            $table->json('normalized_json');
            $table->string('status', 16)->default('review');
            $table->timestamps();
            $table->unique(['connection_id','event_id']);
            $table->unique(['connection_id','external_order_id'],'commerce_conn_external_order_unique');
            $table->index(['company_id','status','created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commerce_order_events');
        Schema::dropIfExists('commerce_sku_mappings');
        Schema::dropIfExists('commerce_connections');
        Schema::dropIfExists('business_unit_warehouses');
        Schema::dropIfExists('business_units');
    }
};
