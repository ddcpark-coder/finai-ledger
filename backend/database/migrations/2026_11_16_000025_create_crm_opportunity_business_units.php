<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // New association table only: never alter historical CRM tables in place.
        // Migrate only in an isolated FinAI test database until rollout QA is approved.
        Schema::create('crm_opportunity_business_units', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('opportunity_id')->constrained('crm_opportunities')->cascadeOnDelete();
            $table->foreignId('business_unit_id')->constrained('business_units')->restrictOnDelete();
            $table->timestamps();

            // At most one operating unit per CRM opportunity.
            $table->unique('opportunity_id', 'finai_crm_opportunity_one_unit');
            $table->index(['company_id', 'business_unit_id'], 'finai_crm_unit_company_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_opportunity_business_units');
    }
};
