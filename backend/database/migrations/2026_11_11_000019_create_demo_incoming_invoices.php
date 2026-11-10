<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('demo_incoming_invoices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->string('partner_name', 120);
            $table->string('partner_key', 120);
            $table->string('invoice_number', 60);
            $table->string('invoice_number_key', 60);
            $table->unsignedBigInteger('gross_cents');
            $table->date('issue_date');
            $table->date('due_date');
            $table->string('currency', 3)->default('EUR');
            $table->string('status', 20)->default('review');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['company_id','partner_key','invoice_number_key'], 'demo_incoming_company_partner_number_unique');
            $table->index(['company_id','status','due_date']);
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('demo_incoming_invoices');
    }
};
