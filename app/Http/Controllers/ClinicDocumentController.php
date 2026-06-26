<?php

namespace App\Http\Controllers;

use App\Support\ClinicRegistrationDocuments;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClinicDocumentController extends Controller
{
    public function show(Request $request, string $path): StreamedResponse
    {
        $decodedPath = base64_decode($path, true);

        if (
            ! is_string($decodedPath)
            || $decodedPath === ''
            || ! str_starts_with($decodedPath, ClinicRegistrationDocuments::DOCUMENT_PATH.'/')
        ) {
            abort(404);
        }

        $user = $request->user();

        if (! $user?->isPlatformAdmin()) {
            abort(403);
        }

        foreach (ClinicRegistrationDocuments::candidateDisks() as $diskName) {
            $disk = Storage::disk($diskName);

            if ($disk->exists($decodedPath)) {
                return $disk->response($decodedPath);
            }
        }

        abort(404);
    }
}
