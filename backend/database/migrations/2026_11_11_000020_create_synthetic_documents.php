<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('synthetic_documents',function(Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users');
            $table->string('original_name', 140);
            $table->string('mime', 40);
            $table->unsignedInteger('size_bytes');
            $table->char('sha256',64);
            // Application-encrypted bytes; never a web-served path or plaintext.
            $table->longText('encrypted_payload');
            $table->timestamps();
            $table->index(['company_id','created_at']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('synthetic_documents');
    }
};
