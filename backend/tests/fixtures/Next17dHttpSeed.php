<?php
// Strictly isolated GitHub CI fixture: never run on Hiper M or with real data.
declare(strict_types=1);

use App\Models\Company;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$root = getenv('RUNNER_TEMP') ?: '';
$db = getenv('DB_DATABASE') ?: '';
if (getenv('GITHUB_ACTIONS') !== 'true' || getenv('CI') !== 'true' ||
    app()->environment() !== 'testing' ||
    getenv('DB_CONNECTION') !== 'sqlite' ||
    !is_dir($root) || is_link($root) ||
    !$db || !is_file($db) ||
    dirname(realpath($db)) !== realpath($root) ||
    str_contains($db, "\0")) {
    fwrite(STDERR, "REFUSED: independent, disposable CI-only SQLite required\n");
    exit(42);
}
$mode = $argv[1] ?? '';
if ($mode === 'seed') {
    if (DB::table('users')->exists() || DB::table('companies')->exists()) {
        throw new RuntimeException('Synthetic QA database must be initially empty.');
    }
    $company = Company::create(['name'=>'SYNTHETIC-NEXT17D-COMPANY','active'=>true]);
    $permission = DB::table('permissions')->insertGetId([
        'key'=>'documents.write','name'=>'Synthetic receipt write',
    ]);
    foreach (['writer', 'owner'] as $key) {
        $role = DB::table('roles')->insertGetId([
            'key'=>$key,'name'=>'Synthetic '.ucfirst($key),'system'=>true,
        ]);
        DB::table('permission_role')->insert([
            'role_id'=>$role,'permission_id'=>$permission,
        ]);
        $user = User::create([
            'name'=>'Synthetic '.ucfirst($key),
            'email'=>$key.'@example.test',
            'password'=>'synthetic-ci-login-not-real-2026',
            'active'=>true,
        ]);
        $user->forceFill(['email_verified_at'=>now()])->save();
        $user->companies()->attach($company->id, [
            'role_id'=>$role,'status'=>'active','joined_at'=>now(),
        ]);
        if ($key === 'owner') {
            $secret = app(TwoFactorAuthenticationProvider::class)->generateSecretKey();
            $user->forceFill([
                'two_factor_secret'=>encrypt($secret),
                'two_factor_recovery_codes'=>encrypt(json_encode([
                    'synthetic-one-time-recovery-not-real',
                ],JSON_THROW_ON_ERROR)),
                'two_factor_confirmed_at'=>now(),
            ])->save();
            $file = $root.'/.finai-next17d-totp-synthetic';
            if (file_exists($file)) {
                throw new RuntimeException('Existing CI test token file must not be replaced.');
            }
            file_put_contents($file, $secret, LOCK_EX);
            chmod($file, 0600);
        }
    }
    echo "FINAI_SYNTHETIC_HTTP_FIXTURE_READY\n";
    exit(0);
}
if ($mode === 'revoke-owner') {
    $user = User::where('email','owner@example.test')->firstOrFail();
    $changed = DB::table('company_user')
        ->where('user_id',$user->id)->where('status','active')
        ->update(['status'=>'suspended']);
    if ($changed !== 1) {
        throw new RuntimeException('Expected one isolated synthetic membership revocation.');
    }
    echo "FINAI_SYNTHETIC_MEMBERSHIP_REVOKED\n";
    exit(0);
}
fwrite(STDERR,"Unknown synthetic QA fixture operation.\n");
exit(2);
