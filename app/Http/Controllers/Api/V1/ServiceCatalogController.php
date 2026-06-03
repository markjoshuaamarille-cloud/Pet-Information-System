<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\ServiceCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * @group Service Catalog
 */
class ServiceCatalogController extends Controller
{
    public function index(): JsonResponse
    {
        return $this->success([
            'services' => ServiceCatalog::query()->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'nullable|string|max:100|unique:service_catalogs,code',
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'default_price' => 'required|numeric|min:0',
        ]);

        if (empty($validated['code'])) {
            $validated['code'] = Str::slug($validated['name'], '_');
        }

        $service = ServiceCatalog::create($validated);

        return $this->created(['service' => $service]);
    }

    public function update(Request $request, ServiceCatalog $serviceCatalog): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:100|unique:service_catalogs,code,'.$serviceCatalog->id,
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'default_price' => 'required|numeric|min:0',
        ]);

        $serviceCatalog->update($validated);

        return $this->success(['service' => $serviceCatalog->fresh()]);
    }

    public function destroy(ServiceCatalog $serviceCatalog): JsonResponse
    {
        $serviceCatalog->delete();

        return $this->deleted('Service removed from catalog.');
    }
}
