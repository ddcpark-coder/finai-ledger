<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('accounting_ai_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->string('rule_key', 100);
            $table->string('source', 30)->default('manual');
            $table->json('conditions_json');
            $table->json('action_json');
            $table->unsignedInteger('priority')->default(100);
            $table->boolean('active')->default(true);
            $table->unsignedInteger('times_applied')->default(0);
            $table->unsignedInteger('times_accepted')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'rule_key']);
            $table->index(['company_id', 'partner_id', 'active']);
        });

        Schema::create('ai_accounting_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incoming_invoice_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider', 50)->default('hybrid');
            $table->decimal('confidence', 5, 2);
            $table->string('risk_level', 20)->default('normal');
            $table->json('suggestion_json');
            $table->json('explanation_json');
            $table->json('signals_json')->nullable();
            $table->string('status', 20)->default('proposed');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status', 'confidence']);
            $table->index(['incoming_invoice_id', 'status']);
        });

        Schema::create('ai_learning_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('incoming_invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('journal_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event_type', 40);
            $table->json('features_json');
            $table->json('result_json');
            $table->decimal('confidence', 5, 2)->nullable();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'partner_id', 'event_type']);
        });

        Schema::create('ai_anomalies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incoming_invoice_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('type', 60);
            $table->string('severity', 20)->default('medium');
            $table->decimal('score', 5, 2);
            $table->string('status', 20)->default('open');
            $table->json('evidence_json');
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status', 'severity']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_anomalies');
        Schema::dropIfExists('ai_learning_events');
        Schema::dropIfExists('ai_accounting_suggestions');
        Schema::dropIfExists('accounting_ai_rules');
    }
};
