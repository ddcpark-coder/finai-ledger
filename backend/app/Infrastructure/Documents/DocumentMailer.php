<?php

namespace App\Infrastructure\Documents;

interface DocumentMailer
{
    public function send(string $recipient, string $subject, string $body, array $attachment): array;
}
