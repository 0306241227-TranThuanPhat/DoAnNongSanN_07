<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Global Error Handling: Trả về JSON đồng nhất cho toàn bộ API
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*')) {
                $statusCode = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 400;
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => $e->validator->errors()->first(),
                        'errors'  => $e->errors(),
                    ], 422);
                }

                return response()->json([
                    'status'  => 'error',
                    'message' => $e->getMessage() ?: 'Đã xảy ra lỗi xử lý trên hệ thống!',
                ], $statusCode >= 400 && $statusCode < 600 ? $statusCode : 400);
            }
        });
    })->create();