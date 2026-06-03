<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller as BaseController;
use App\Http\Controllers\Concerns\InteractsWithClinicUsers;
use Illuminate\Http\JsonResponse;

abstract class Controller extends BaseController
{
    use InteractsWithClinicUsers;

    protected function success(mixed $data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        $payload = ['message' => $message];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        return response()->json($payload, $status);
    }

    protected function created(mixed $data = null, string $message = 'Created successfully.'): JsonResponse
    {
        return $this->success($data, $message, 201);
    }

    protected function deleted(string $message = 'Deleted successfully.'): JsonResponse
    {
        return $this->success(null, $message);
    }
}
