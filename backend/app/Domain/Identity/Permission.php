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
