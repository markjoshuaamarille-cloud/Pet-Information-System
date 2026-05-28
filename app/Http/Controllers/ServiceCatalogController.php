<?php

namespace App\Http\Controllers;

use App\Models\ServiceCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ServiceCatalogController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('ServiceCatalog/Index', [
            'services' => ServiceCatalog::query()
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:120', 'alpha_dash', Rule::unique('service_catalogs', 'code')],
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:120',
            'default_price' => 'required|numeric|min:0',
        ]);

        $validated['code'] = $this->resolveServiceCode(
            $validated['code'] ?? null,
            $validated['name'],
        );

        ServiceCatalog::create($validated);

        return redirect()->back()->with('success', 'Service added successfully.');
    }

    public function update(Request $request, ServiceCatalog $serviceCatalog): RedirectResponse
    {
        $validated = $request->validate([
            'code' => [
                'nullable',
                'string',
                'max:120',
                'alpha_dash',
                Rule::unique('service_catalogs', 'code')->ignore($serviceCatalog->id),
            ],
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:120',
            'default_price' => 'required|numeric|min:0',
        ]);

        $validated['code'] = $this->resolveServiceCode(
            $validated['code'] ?? null,
            $validated['name'],
            $serviceCatalog->id,
        );

        $serviceCatalog->update($validated);

        return redirect()->back()->with('success', 'Service updated successfully.');
    }

    public function destroy(ServiceCatalog $serviceCatalog): RedirectResponse
    {
        $serviceCatalog->delete();

        return redirect()->back()->with('success', 'Service deleted successfully.');
    }

    private function resolveServiceCode(?string $inputCode, string $name, ?int $ignoreId = null): string
    {
        $base = $inputCode ? Str::lower($inputCode) : Str::slug($name, '-');
        $base = $base !== '' ? $base : 'service';
        $candidate = $base;
        $suffix = 2;

        while ($this->codeExists($candidate, $ignoreId)) {
            $candidate = "{$base}-{$suffix}";
            $suffix++;
        }

        return $candidate;
    }

    private function codeExists(string $code, ?int $ignoreId = null): bool
    {
        return ServiceCatalog::query()
            ->where('code', $code)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();
    }
}
