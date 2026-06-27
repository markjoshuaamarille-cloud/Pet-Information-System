<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ClinicRegistrationDocuments
{
    public const DOCUMENT_PATH = 'clinic-registrations';

    /** @var list<string> */
    public const DOCUMENT_RULES = ['file', 'max:10240', 'mimes:jpg,jpeg,png,webp,gif,pdf'];

    public static function disk(): string
    {
        return self::writeDisks()[0];
    }

    public static function s3Configured(): bool
    {
        $s3 = config('filesystems.disks.s3');

        return filled($s3['key'] ?? null)
            && filled($s3['secret'] ?? null)
            && filled($s3['bucket'] ?? null)
            && filled($s3['region'] ?? null);
    }

    /**
     * @return list<string>
     */
    public static function writeDisks(): array
    {
        $disks = [];

        if (self::s3Configured()) {
            $disks[] = 's3';
        }

        $disks[] = 'public';
        $disks[] = 'local';

        return array_values(array_unique($disks));
    }

    /**
     * @return list<string>
     */
    public static function candidateDisks(): array
    {
        return self::writeDisks();
    }

    public static function store(UploadedFile $file, string $subdirectory): string
    {
        $directory = self::DOCUMENT_PATH.'/'.$subdirectory;

        foreach (self::writeDisks() as $diskName) {
            try {
                /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
                $disk = Storage::disk($diskName);
                $path = $disk->putFile($directory, $file);

                if (is_string($path) && $path !== '' && $disk->exists($path)) {
                    return $path;
                }
            } catch (\Throwable) {
                continue;
            }
        }

        throw ValidationException::withMessages([
            'documents' => 'Unable to store the uploaded document. Please try again.',
        ]);
    }

    public static function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        foreach (self::candidateDisks() as $diskName) {
            try {
                /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
                $disk = Storage::disk($diskName);

                if (! $disk->exists($path)) {
                    continue;
                }

                if ($diskName === 's3') {
                    return $disk->temporaryUrl($path, now()->addHour());
                }

                if ($diskName === 'local') {
                    return route('clinic-documents.show', [
                        'path' => base64_encode($path),
                    ], absolute: false);
                }

                return $disk->url($path);
            } catch (\Throwable) {
                continue;
            }
        }

        return null;
    }

    public static function delete(?string $path): void
    {
        if (! $path) {
            return;
        }

        foreach (self::candidateDisks() as $diskName) {
            try {
                $disk = Storage::disk($diskName);

                if ($disk->exists($path)) {
                    $disk->delete($path);

                    return;
                }
            } catch (\Throwable) {
                continue;
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function validationRules(bool $requireMandatory = false): array
    {
        $mandatoryRule = $requireMandatory ? ['required', ...self::DOCUMENT_RULES] : ['nullable', ...self::DOCUMENT_RULES];

        return [
            'barangay_clearance' => $mandatoryRule,
            'business_permit' => $mandatoryRule,
            'other_requirement_labels' => ['nullable', 'array'],
            'other_requirement_labels.*' => ['nullable', 'string', 'max:255'],
            'other_requirement_files' => ['nullable', 'array'],
            'other_requirement_files.*' => ['nullable', ...self::DOCUMENT_RULES],
        ];
    }

    public static function validateOtherRequirements(Request $request): void
    {
        $labels = $request->input('other_requirement_labels', []);
        $files = $request->file('other_requirement_files', []);
        $errors = [];

        foreach ($labels as $index => $label) {
            $label = trim((string) $label);
            $file = $files[$index] ?? null;

            if ($label !== '' && ! $file instanceof UploadedFile) {
                $errors["other_requirement_files.{$index}"] = 'Please upload a file for this requirement.';
            }

            if ($file instanceof UploadedFile && $label === '') {
                $errors["other_requirement_labels.{$index}"] = 'Please describe this requirement.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * @return list<array{label: string, path: string}>
     */
    public static function storeOtherRequirements(Request $request): array
    {
        $labels = $request->input('other_requirement_labels', []);
        $files = $request->file('other_requirement_files', []);
        $stored = [];

        foreach ($files as $index => $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $label = trim((string) ($labels[$index] ?? ''));

            $stored[] = [
                'label' => $label !== '' ? $label : 'Other requirement',
                'path' => self::store($file, 'other'),
            ];
        }

        return $stored;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public static function mergeUploadedDocuments(Request $request, array $payload, bool $requireMandatory = false): array
    {
        self::validateOtherRequirements($request);

        if ($request->hasFile('barangay_clearance')) {
            $payload['barangay_clearance_path'] = self::store(
                $request->file('barangay_clearance'),
                'barangay-clearance',
            );
        } elseif ($requireMandatory) {
            throw ValidationException::withMessages([
                'barangay_clearance' => 'Barangay Clearance is required.',
            ]);
        }

        if ($request->hasFile('business_permit')) {
            $payload['business_permit_path'] = self::store(
                $request->file('business_permit'),
                'business-permit',
            );
        } elseif ($requireMandatory) {
            throw ValidationException::withMessages([
                'business_permit' => 'Mayor\'s Permit / Business Permit (BPLO) is required.',
            ]);
        }

        $newOtherRequirements = self::storeOtherRequirements($request);

        if ($newOtherRequirements !== []) {
            $payload['other_requirements'] = array_values(array_merge(
                $payload['other_requirements'] ?? [],
                $newOtherRequirements,
            ));
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public static function mergeUploadedDocumentsForUpdate(Request $request, array $payload, ?\App\Models\Clinic $clinic = null): array
    {
        self::validateOtherRequirements($request);

        if ($request->hasFile('barangay_clearance')) {
            if ($clinic?->barangay_clearance_path) {
                self::delete($clinic->barangay_clearance_path);
            }

            $payload['barangay_clearance_path'] = self::store(
                $request->file('barangay_clearance'),
                'barangay-clearance',
            );
        }

        if ($request->hasFile('business_permit')) {
            if ($clinic?->business_permit_path) {
                self::delete($clinic->business_permit_path);
            }

            $payload['business_permit_path'] = self::store(
                $request->file('business_permit'),
                'business-permit',
            );
        }

        $newOtherRequirements = self::storeOtherRequirements($request);

        if ($newOtherRequirements !== []) {
            $payload['other_requirements'] = array_values(array_merge(
                $clinic?->other_requirements ?? [],
                $newOtherRequirements,
            ));
        }

        return $payload;
    }
}
