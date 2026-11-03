<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('project_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedBigInteger('next_number')->default(1);
            $table->timestamps();
            $table->unique(['company_id','year']);
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('partner_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('sales_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('number',80);
            $table->string('name');
            $table->string('status',30)->default('planned');
            $table->date('starts_on')->nullable();
            $table->date('due_on')->nullable();
            $table->date('completed_on')->nullable();
            $table->decimal('budget_revenue',18,2)->default(0);
            $table->decimal('budget_cost',18,2)->default(0);
            $table->decimal('actual_revenue',18,2)->default(0);
            $table->decimal('actual_cost',18,2)->default(0);
            $table->decimal('actual_margin',18,2)->default(0);
            $table->decimal('actual_margin_percent',7,2)->nullable();
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['company_id','number']);
            $table->unique('sales_order_id');
            $table->index(['company_id','status','due_on']);
            $table->index(['partner_id','status']);
        });

        Schema::create('project_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('project_tasks')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status',30)->default('todo');
            $table->string('priority',20)->default('normal');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('estimated_hours',10,2)->nullable();
            $table->decimal('actual_hours',10,2)->default(0);
            $table->date('starts_on')->nullable();
            $table->date('due_on')->nullable();
            $table->timestamps();

            $table->index(['project_id','status','due_on']);
            $table->index(['assigned_to','status','due_on']);
        });

        Schema::create('work_order_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedBigInteger('next_number')->default(1);
            $table->timestamps();
            $table->unique(['company_id','year']);
        });

        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_task_id')->nullable()->constrained()->nullOnDelete();
            $table->string('number',80);
            $table->string('title');
            $table->string('status',30)->default('planned');
            $table->string('work_type',40)->default('internal');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('scheduled_start')->nullable();
            $table->dateTime('scheduled_end')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->text('instructions')->nullable();
            $table->timestamps();

            $table->unique(['company_id','number']);
            $table->index(['project_id','status','scheduled_start']);
            $table->index(['assigned_to','status','scheduled_start']);
        });

        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_task_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('work_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained();
            $table->date('work_date');
            $table->decimal('hours',8,2);
            $table->decimal('cost_rate',18,4)->default(0);
            $table->decimal('billable_rate',18,4)->nullable();
            $table->boolean('billable')->default(false);
            $table->text('description')->nullable();
            $table->string('status',20)->default('approved');
            $table->timestamps();

            $table->index(['project_id','work_date']);
            $table->index(['user_id','work_date','status']);
        });

        Schema::create('project_financial_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('entry_type',30);
            $table->string('category',40);
            $table->decimal('amount',18,2);
            $table->string('source_type',60);
            $table->unsignedBigInteger('source_id');
            $table->string('description')->nullable();
            $table->date('recognized_on');
            $table->timestamps();

            $table->unique(['project_id','entry_type','source_type','source_id'],'project_financial_source_unique');
            $table->index(['project_id','entry_type','recognized_on']);
            $table->index(['company_id','recognized_on']);
        });

        Schema::create('project_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('event_type',50);
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['project_id','occurred_at']);
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->after('sales_order_id')->constrained()->nullOnDelete();
        });

        Schema::table('incoming_invoices', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->after('partner_id')->constrained()->nullOnDelete();
        });

        Schema::table('issued_invoices', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->after('sales_order_id')->constrained()->nullOnDelete();
        });

        Schema::table('delivery_notes', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->after('sales_order_id')->constrained()->nullOnDelete();
        });

        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->after('company_id')->constrained()->nullOnDelete();
            $table->index(['project_id','occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table) {
            $table->dropIndex(['project_id','occurred_at']);
            $table->dropConstrainedForeignId('project_id');
        });
        Schema::table('delivery_notes', fn (Blueprint $table) => $table->dropConstrainedForeignId('project_id'));
        Schema::table('issued_invoices', fn (Blueprint $table) => $table->dropConstrainedForeignId('project_id'));
        Schema::table('incoming_invoices', fn (Blueprint $table) => $table->dropConstrainedForeignId('project_id'));
        Schema::table('purchase_orders', fn (Blueprint $table) => $table->dropConstrainedForeignId('project_id'));
        Schema::dropIfExists('project_events');
        Schema::dropIfExists('project_financial_entries');
        Schema::dropIfExists('time_entries');
        Schema::dropIfExists('work_orders');
        Schema::dropIfExists('work_order_sequences');
        Schema::dropIfExists('project_tasks');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('project_sequences');
    }
};
