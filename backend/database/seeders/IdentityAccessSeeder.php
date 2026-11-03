<?php

namespace Database\Seeders;

use App\Domain\Identity\Permission;
use App\Domain\Identity\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IdentityAccessSeeder extends Seeder
{
    public function run(): void
    {
        $roleIds = [];
        foreach (Role::cases() as $role) {
            $roleIds[$role->value] = DB::table('roles')->insertGetId([
                'key' => $role->value,
                'name' => ucfirst($role->value),
                'system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $permissionIds = [];
        foreach (Permission::cases() as $permission) {
            $permissionIds[$permission->value] = DB::table('permissions')->insertGetId([
                'key' => $permission->value,
                'name' => $permission->value,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $matrix = [
            Role::Owner->value => array_column(Permission::cases(), 'value'),
            Role::Admin->value => [
                'company.manage','users.manage','roles.manage','invoices.read','invoices.write',
                'invoices.approve','crm.read','crm.write','quotes.read','quotes.write','ledger.read','ledger.post','bank.read','bank.reconcile',
                'tax.read','tax.prepare','integrations.manage','audit.read','settings.manage',
            ],
            Role::Accountant->value => [
                'invoices.read','invoices.write','invoices.approve','crm.read','quotes.read','quotes.write','ledger.read','ledger.post',
                'ledger.close_period','bank.read','bank.reconcile','tax.read','tax.prepare',
                'tax.submit','audit.read',
            ],
            Role::Operator->value => [
                'invoices.read','invoices.write','crm.read','crm.write','quotes.read','quotes.write','bank.read','tax.read',
            ],
            Role::Viewer->value => [
                'invoices.read','crm.read','quotes.read','ledger.read','bank.read','tax.read',
            ],
        ];

        foreach ($matrix as $roleKey => $permissions) {
            foreach ($permissions as $permissionKey) {
                DB::table('permission_role')->insert([
                    'role_id' => $roleIds[$roleKey],
                    'permission_id' => $permissionIds[$permissionKey],
                ]);
            }
        }
    }
}
