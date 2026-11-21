<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable;

    const CREATED_AT = 'ngay_tao';
    const UPDATED_AT = 'ngay_cap_nhat';

    protected $fillable = [
        'role_id', 'ho_ten', 'email', 'so_dien_thoai',
        'mat_khau', 'diem_tich_luy', 'trang_thai'
    ];

    protected $hidden = ['mat_khau'];

    public function getAuthPasswordName()
    {
        return 'mat_khau';
    }

    public function getAuthPassword()
    {
        return $this->mat_khau;
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return ['role' => $this->role?->ma_vai_tro];
    }
}