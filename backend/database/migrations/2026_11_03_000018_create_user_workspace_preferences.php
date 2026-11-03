<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_workspace_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->json('last_route')->nullable();
            $table->json('favorites')->nullable();
            $table->json('appearance')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->unique(['company_id','user_id']);
            $table->index(['user_id','updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_workspace_preferences');
    }
};
