<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\NearbyPlacesController as WebNearbyPlacesController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Nearby Places
 */
class NearbyPlacesController extends Controller
{
    public function index(): JsonResponse
    {
        return $this->success(['message' => 'Use geocode and search endpoints for nearby veterinary services.']);
    }

    public function geocode(Request $request): JsonResponse
    {
        $response = app(WebNearbyPlacesController::class)->geocode($request);

        return response()->json(json_decode($response->getContent(), true), $response->getStatusCode());
    }

    public function search(Request $request): JsonResponse
    {
        $response = app(WebNearbyPlacesController::class)->search($request);

        return response()->json(json_decode($response->getContent(), true), $response->getStatusCode());
    }
}
