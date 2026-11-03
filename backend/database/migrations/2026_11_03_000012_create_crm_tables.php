<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('crm_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('job_title')->nullable();
            $table->boolean('primary_contact')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['company_id', 'partner_id', 'active']);
            $table->index(['company_id', 'email']);
        });

        Schema::create('crm_leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('crm_contacts')->nullOnDelete();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('source', 50)->nullable();
            $table->string('status', 30)->default('new');
            $table->unsignedTinyInteger('score')->nullable();
            $table->decimal('estimated_value', 18, 2)->nullable();
            $table->string('currency', 3)->default('EUR');
            $table->timestamp('next_action_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status', 'owner_user_id']);
            $table->index(['company_id', 'next_action_at']);
        });

        Schema::create('crm_opportunities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('crm_leads')->nullOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('crm_contacts')->nullOnDelete();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('stage', 30)->default('qualification');
            $table->unsignedTinyInteger('probability_percent')->default(10);
            $table->decimal('value', 18, 2)->default(0);
            $table->string('currency', 3)->default('EUR');
            $table->date('expected_close_date')->nullable();
            $table->string('lost_reason')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'stage', 'owner_user_id']);
            $table->index(['company_id', 'expected_close_date']);
        });

        Schema::create('crm_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('crm_contacts')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('crm_leads')->nullOnDelete();
            $table->foreignId('opportunity_id')->nullable()->constrained('crm_opportunities')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 30);
            $table->string('subject');
            $table->text('description')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('status', 20)->default('open');
            $table->timestamps();

            $table->index(['company_id', 'assigned_to', 'status', 'due_at']);
            $table->index(['opportunity_id', 'created_at']);
        });

        Schema::create('crm_communications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained('crm_contacts')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('crm_leads')->nullOnDelete();
            $table->foreignId('opportunity_id')->nullable()->constrained('crm_opportunities')->nullOnDelete();
            $table->string('channel', 30);
            $table->string('direction', 20);
            $table->string('subject')->nullable();
            $table->text('summary')->nullable();
            $table->string('external_message_id', 200)->nullable();
            $table->timestamp('occurred_at');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'occurred_at']);
            $table->index(['partner_id', 'occurred_at']);
        });

        Schema::create('crm_tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 20)->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'name']);
        });

        Schema::create('crm_tag_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crm_tag_id')->constrained('crm_tags')->cascadeOnDelete();
            $table->string('entity_type', 30);
            $table->unsignedBigInteger('entity_id');
            $table->timestamps();

            $table->unique(['crm_tag_id', 'entity_type', 'entity_id'], 'crm_tag_entity_unique');
            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_tag_links');
        Schema::dropIfExists('crm_tags');
        Schema::dropIfExists('crm_communications');
        Schema::dropIfExists('crm_activities');
        Schema::dropIfExists('crm_opportunities');
        Schema::dropIfExists('crm_leads');
        Schema::dropIfExists('crm_contacts');
    }
};
