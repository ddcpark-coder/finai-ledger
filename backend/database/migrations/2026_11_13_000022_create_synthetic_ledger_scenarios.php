<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Dedicated demo-only tables: never post into real journals or inventory.
        Schema::create('synthetic_ledger_scenarios', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('state', 24)->default('draft');
            $table->unsignedInteger('version')->default(0);
            $table->unsignedInteger('stock_on_hand')->default(12);
            $table->unsignedInteger('stock_reserved')->default(0);
            $table->unsignedInteger('stock_dispatched')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'user_id']);
        });

        Schema::create('synthetic_ledger_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('scenario_id')->constrained('synthetic_ledger_scenarios')->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('client_event_id');
            $table->string('action', 24);
            $table->unsignedInteger('version');
            $table->json('journal_lines');
            $table->json('stock_movement');
            $table->timestamp('created_at');
            $table->unique(['scenario_id', 'client_event_id'], 'synthetic_ledger_event_uuid_unique');
            $table->unique(['scenario_id', 'action'], 'synthetic_ledger_single_action_unique');
            $table->index(['company_id', 'user_id', 'created_at'], 'synthetic_ledger_company_user_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('synthetic_ledger_events');
        Schema::dropIfExists('synthetic_ledger_scenarios');
    }
};
