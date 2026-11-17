<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Isolated local/testing schema ONLY. These are non-posting planning
        // links, never inventory_movements, accounting journals or reservations.
        Schema::create('synthetic_stock_plans', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('source_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignId('target_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignId('commerce_order_event_id')->nullable()
                ->constrained('commerce_order_events')->restrictOnDelete();
            $table->foreignId('synthetic_crm_opportunity_id')->nullable()
                ->constrained('synthetic_crm_opportunities')->restrictOnDelete();
            $table->string('event_id', 80);
            $table->string('sku', 64);
            $table->unsignedInteger('quantity');
            $table->char('fingerprint', 64);
            $table->timestamps();
            $table->unique(['company_id', 'event_id'], 'finai_synth_plan_company_event_unique');
            $table->index(['company_id', 'id'], 'finai_synth_plan_company_cursor');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('synthetic_stock_plans');
    }
};
