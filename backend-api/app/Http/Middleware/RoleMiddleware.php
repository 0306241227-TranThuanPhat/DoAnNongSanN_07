<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = auth('api')->user();
        if (!$user || !in_array($user->role?->ma_vai_tro, $roles)) {
            return response()->json([
                'message' => 'Bạn không có quyền thực hiện thao tác này (NFR-06).'
            ], 403);
        }
        return $next($request);
    }
}