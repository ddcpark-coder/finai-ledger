<?php

namespace App\Domain\Identity;

enum Permission: string
{
    case CompanyManage = 'company.manage';
    case UsersManage = 'users.manage';
    case RolesManage = 'roles.manage';
    case InvoicesRead = 'invoices.read';
    case InvoicesWrite = 'invoices.write';
    case InvoicesApprove = 'invoices.approve';
    case CrmRead = 'crm.read';
    case CrmWrite = 'crm.write';
    case QuotesRead = 'quotes.read';
    case QuotesWrite = 'quotes.write';
    case OrdersRead = 'orders.read';
    case OrdersWrite = 'orders.write';
    case ProcurementRead = 'procurement.read';
    case ProcurementWrite = 'procurement.write';
    case ProcurementApprove = 'procurement.approve';
    case InventoryRead = 'inventory.read';
    case InventoryWrite = 'inventory.write';
    case InventoryCount = 'inventory.count';
    case LedgerRead = 'ledger.read';
    case LedgerPost = 'ledger.post';
    case LedgerClosePeriod = 'ledger.close_period';
    case BankRead = 'bank.read';
    case BankReconcile = 'bank.reconcile';
    case TaxRead = 'tax.read';
    case TaxPrepare = 'tax.prepare';
    case TaxSubmit = 'tax.submit';
    case IntegrationsManage = 'integrations.manage';
    case AuditRead = 'audit.read';
    case SettingsManage = 'settings.manage';
}
