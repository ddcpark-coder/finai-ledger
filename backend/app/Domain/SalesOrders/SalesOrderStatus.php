<?php
namespace App\Domain\SalesOrders;

enum SalesOrderStatus: string
{
    case Confirmed='confirmed';
    case InProgress='in_progress';
    case ReadyForDelivery='ready_for_delivery';
    case PartiallyDelivered='partially_delivered';
    case Delivered='delivered';
    case Invoiced='invoiced';
    case Completed='completed';
    case Cancelled='cancelled';
}
