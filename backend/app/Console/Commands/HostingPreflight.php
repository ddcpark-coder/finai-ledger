<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

final class HostingPreflight extends Command
{
    protected $signature = 'finai:preflight {--database : Perform a read-only SELECT 1 using configured database}';

    protected $description = 'Read-only validation of FinAI deployment prerequisites without exposing secrets';

    public function handle(): int
    {
        $production=app()->environment('production');
        $checks=[
            'PHP >= 8.4' => PHP_VERSION_ID >= 80400,
            'PDO extension enabled' => extension_loaded('pdo'),
            'PDO MySQL driver for production' => ! $production
                || extension_loaded('pdo')
                    && in_array('mysql', \PDO::getAvailableDrivers(), true),
            'Composer lock committed' => is_file(base_path('composer.lock')),
            'APP_KEY configured' => is_string(config('app.key'))
                && strlen((string) config('app.key')) >= 32,
            'Production APP_DEBUG off' => ! $production || config('app.debug') === false,
            'Production uses HTTPS' => ! $production
                || str_starts_with((string) config('app.url'), 'https://'),
            'Production DB is MySQL/MariaDB' => ! $production
                || config('database.default') === 'mysql',
            'Production uses secure cookies' => ! $production
                || config('session.secure') === true,
            'Production session domain configured' => ! $production
                || (bool) config('session.domain'),
            'Production CORS origin allowlist' => ! $production
                || count(config('cors.allowed_origins', [])) > 0
                    && ! in_array('*', config('cors.allowed_origins', []), true),
            'Production login remains locked' => ! $production
                || config('finai.auth_release_enabled') === false,
        ];

        if ($this->option('database')) {
            try {
                DB::select('SELECT 1');
                $checks['Read-only database connection']=true;
            } catch (Throwable) {
                $checks['Read-only database connection']=false;
            }
        }

        foreach ($checks as $name=>$passed) {
            $this->line(($passed ? '[PASS] ' : '[FAIL] ').$name);
        }

        $this->warn('Manual gates not verified: cPanel docroot, SSL, backups, actual role provisioning, 2FA frontend, and production CORS/CSRF smoke tests.');
        return in_array(false, $checks, true) ? self::FAILURE : self::SUCCESS;
    }
}
