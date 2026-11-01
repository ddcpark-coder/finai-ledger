<?php

namespace App\Domain\Identity;

enum Role: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Accountant = 'accountant';
    case Operator = 'operator';
    case Viewer = 'viewer';
}
