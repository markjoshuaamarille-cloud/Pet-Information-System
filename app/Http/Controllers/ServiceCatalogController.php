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
    public function index(Request $request): Response
    {
        $clinicId = $request->attributes->get('active_clinic_id');

        return Inertia::render('ServiceCatalog/Index', [
            'services' => ServiceCatalog::forClinic($clinicId)
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $clinicId = $request->attributes->get('active_clinic_id');

        $validated = $request->validate([
            'code' => [
                'nullable',
                'string',
                'max:120',
                'alpha_dash',
                Rule::unique('service_catalogs', 'code')->where(fn ($query) => $query->where('clinic_id', $clinicId)),
            ],
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:120',
            'default_price' => 'required|numeric|min:0',
        ]);

        $validated['code'] = $this->resolveServiceCode(
            $validated['code'] ?? null,
            $validated['name'],
            clinicId: $clinicId,
        );
        $validated['clinic_id'] = $clinicId;

        ServiceCatalog::create($validated);

        return redirect()->back()->with('success', 'Service added successfully.');
    }

    public function update(Request $request, ServiceCatalog $serviceCatalog): RedirectResponse
    {
        $clinicId = $request->attributes->get('active_clinic_id');

        $validated = $request->validate([
            'code' => [
                'nullable',
                'string',
                'max:120',
                'alpha_dash',
                Rule::unique('service_catalogs', 'code')
                    ->where(fn ($query) => $query->where('clinic_id', $clinicId))
                    ->ignore($serviceCatalog->id),
            ],
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:120',
            'default_price' => 'required|numeric|min:0',
        ]);

        $validated['code'] = $this->resolveServiceCode(
            $validated['code'] ?? null,
            $validated['name'],
            $serviceCatalog->id,
            $clinicId,
        );

        $serviceCatalog->update($validated);

        return redirect()->back()->with('success', 'Service updated successfully.');
    }

    public function destroy(ServiceCatalog $serviceCatalog): RedirectResponse
    {
        $serviceCatalog->delete();

        return redirect()->back()->with('success', 'Service deleted successfully.');
    }

    private function resolveServiceCode(?string $inputCode, string $name, ?int $ignoreId = null, ?int $clinicId = null): string
    {
        $base = $inputCode ? Str::lower($inputCode) : Str::slug($name, '-');
        $base = $base !== '' ? $base : 'service';
        $candidate = $base;
        $suffix = 2;

        while ($this->codeExists($candidate, $ignoreId, $clinicId)) {
            $candidate = "{$base}-{$suffix}";
            $suffix++;
        }

        return $candidate;
    }

    private function codeExists(string $code, ?int $ignoreId = null, ?int $clinicId = null): bool
    {
        return ServiceCatalog::query()
            ->where('code', $code)
            ->when($clinicId, fn ($query) => $query->where('clinic_id', $clinicId))
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();
    }
}
