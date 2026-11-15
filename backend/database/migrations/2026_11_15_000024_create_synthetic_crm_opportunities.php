<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // This table is only migrated in isolated local/testing databases.
        Schema::create('synthetic_crm_opportunities', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('business_unit_id')->constrained('business_units')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('deal_id', 50);
            $table->string('stage', 20);
            $table->string('initial_stage', 20);
            $table->unsignedBigInteger('value_cents');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['company_id', 'deal_id'], 'synthetic_crm_company_deal_unique');
            $table->index(['company_id', 'business_unit_id', 'stage'], 'synthetic_crm_unit_stage_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('synthetic_crm_opportunities');
    }
};
