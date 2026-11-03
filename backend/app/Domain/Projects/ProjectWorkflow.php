<?php
namespace App\Domain\Projects;

final class ProjectWorkflow
{
    public static function assertTransition(string $from,string $to): void
    {
        $allowed=[
            'planned'=>['active','cancelled'],
            'active'=>['on_hold','completed','cancelled'],
            'on_hold'=>['active','cancelled'],
            'completed'=>['closed'],
        ];

        if (! in_array($to,$allowed[$from]??[],true)) {
            throw new \DomainException("Invalid project transition {$from} -> {$to}.");
        }
    }
}
