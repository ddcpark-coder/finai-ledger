<?php

return [
    'dashboard' => ['group' => 'core', 'default_enabled' => true, 'permission' => null],
    'incoming_invoices' => ['group' => 'finance', 'default_enabled' => true, 'permission' => 'invoices.read'],
    'issued_invoices' => ['group' => 'sales', 'default_enabled' => true, 'permission' => 'invoices.read'],
    'accounting' => ['group' => 'finance', 'default_enabled' => true, 'permission' => 'ledger.read'],
    'banking' => ['group' => 'finance', 'default_enabled' => true, 'permission' => 'bank.read'],
    'vat' => ['group' => 'finance', 'default_enabled' => true, 'permission' => 'tax.read'],
    'edavki' => ['group' => 'finance', 'default_enabled' => true, 'permission' => 'tax.read'],
    'partners' => ['group' => 'core', 'default_enabled' => true, 'permission' => 'invoices.read'],
    'documents' => ['group' => 'core', 'default_enabled' => true, 'permission' => 'invoices.read'],
    'catalog' => ['group' => 'sales', 'default_enabled' => true, 'permission' => 'invoices.read'],
    'crm' => ['group' => 'sales', 'default_enabled' => true, 'permission' => 'crm.read'],
    'quotes' => ['group' => 'sales', 'default_enabled' => true, 'permission' => 'quotes.read'],
    'orders' => ['group' => 'sales', 'default_enabled' => true, 'permission' => 'orders.read'],
    'procurement' => ['group' => 'operations', 'default_enabled' => true, 'permission' => 'procurement.read'],
    'inventory' => ['group' => 'operations', 'default_enabled' => true, 'permission' => 'inventory.read'],
    'settings' => ['group' => 'system', 'default_enabled' => true, 'permission' => 'settings.manage'],
];
