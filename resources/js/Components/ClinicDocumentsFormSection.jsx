import { useState } from 'react';

export const MAX_CLINIC_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_CLINIC_DOCUMENTS = 'image/jpeg,image/png,image/webp,image/gif,application/pdf';

export function formatClinicDocumentSize(bytes) {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function clinicFormHasDocumentUploads(data) {
    return (
        data.barangay_clearance instanceof File
        || data.business_permit instanceof File
        || (data.other_requirement_files ?? []).some((file) => file instanceof File)
    );
}

export function emptyOtherRequirementRow() {
    return { label: '', file: null };
}

export function initialOtherRequirements() {
    return [emptyOtherRequirementRow()];
}

function DocumentUploadField({ label, required = false, value, onChange, error, hint, currentUrl }) {
    const [localError, setLocalError] = useState('');

    const handleChange = (event) => {
        const file = event.target.files?.[0] ?? null;
        setLocalError('');

        if (!file) {
            onChange(null);
            return;
        }

        if (file.size > MAX_CLINIC_DOCUMENT_BYTES) {
            setLocalError('File must be 10 MB or smaller.');
            event.target.value = '';
            onChange(null);
            return;
        }

        onChange(file);
    };

    return (
        <div>
            <label className="block text-xs font-medium text-gray-600">
                {label}
                {required && ' *'}
            </label>
            {currentUrl && (
                <p className="mt-1 text-xs text-emerald-700">
                    Current file on record —{' '}
                    <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                        View
                    </a>
                </p>
            )}
            <input
                type="file"
                required={required && !currentUrl}
                accept={ACCEPTED_CLINIC_DOCUMENTS}
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-indigo-700"
                onChange={handleChange}
            />
            {value && (
                <p className="mt-1 text-xs text-gray-500">
                    Selected: {value.name} ({formatClinicDocumentSize(value.size)})
                </p>
            )}
            {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
            {(error || localError) && (
                <p className="mt-1 text-xs text-red-500">{error || localError}</p>
            )}
        </div>
    );
}

export default function ClinicDocumentsFormSection({
    form,
    requireMandatory = false,
    existingDocuments = [],
    showExistingList = true,
}) {
    const [otherRequirements, setOtherRequirements] = useState(initialOtherRequirements());

    const existingByKey = Object.fromEntries(
        (existingDocuments ?? []).map((doc) => [doc.key, doc]),
    );

    const syncOtherRequirements = (rows) => {
        setOtherRequirements(rows);
        form.setData({
            ...form.data,
            other_requirement_labels: rows.map((row) => row.label),
            other_requirement_files: rows.map((row) => row.file),
        });
    };

    const updateOtherRequirement = (index, updates) => {
        const rows = otherRequirements.map((row, rowIndex) =>
            rowIndex === index ? { ...row, ...updates } : row,
        );

        syncOtherRequirements(rows);
    };

    const addOtherRequirement = () => {
        syncOtherRequirements([...otherRequirements, emptyOtherRequirementRow()]);
    };

    const removeOtherRequirement = (index) => {
        if (otherRequirements.length === 1) {
            syncOtherRequirements(initialOtherRequirements());
            return;
        }

        syncOtherRequirements(otherRequirements.filter((_, rowIndex) => rowIndex !== index));
    };

    const handleOtherRequirementFile = (index, file) => {
        if (file && file.size > MAX_CLINIC_DOCUMENT_BYTES) {
            updateOtherRequirement(index, { file: null });
            return;
        }

        updateOtherRequirement(index, { file });
    };

    return (
        <div className="space-y-4">
            {showExistingList && existingDocuments.length > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                        Documents on file
                    </p>
                    <ul className="mt-2 space-y-1 text-xs">
                        {existingDocuments.map((doc) => (
                            <li key={doc.key} className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-emerald-900">{doc.label}</span>
                                {doc.url ? (
                                    <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-emerald-700 underline"
                                    >
                                        Open
                                    </a>
                                ) : (
                                    <span className="text-red-600">Unavailable</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-900">
                    {requireMandatory ? 'Required documents' : 'Registration documents'}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                    Upload clear photos or PDF scans. Maximum file size: 10 MB each.
                    {!requireMandatory && ' Leave blank to keep the current file.'}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <DocumentUploadField
                        label="Barangay Clearance"
                        required={requireMandatory}
                        currentUrl={existingByKey.barangay_clearance?.url}
                        value={form.data.barangay_clearance}
                        onChange={(file) => form.setData('barangay_clearance', file)}
                        error={form.errors.barangay_clearance}
                    />
                    <DocumentUploadField
                        label="Mayor's Permit / Business Permit (BPLO)"
                        required={requireMandatory}
                        currentUrl={existingByKey.business_permit?.url}
                        value={form.data.business_permit}
                        onChange={(file) => form.setData('business_permit', file)}
                        error={form.errors.business_permit}
                    />
                </div>
                {form.errors.documents && (
                    <p className="mt-2 text-xs text-red-500">{form.errors.documents}</p>
                )}
            </div>

            <div className="rounded-lg border border-dashed border-gray-300 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Other requirements (optional)</h3>
                        <p className="mt-1 text-xs text-gray-500">
                            Add another document if needed and describe what it is.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={addOtherRequirement}
                        className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                        + Add requirement
                    </button>
                </div>

                <div className="mt-4 space-y-4">
                    {otherRequirements.map((row, index) => (
                        <div
                            key={`other-requirement-${index}`}
                            className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"
                        >
                            <div>
                                <label className="block text-xs font-medium text-gray-600">
                                    Requirement name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Fire Safety Certificate"
                                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                                    value={row.label}
                                    onChange={(e) => updateOtherRequirement(index, { label: e.target.value })}
                                />
                                {form.errors[`other_requirement_labels.${index}`] && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {form.errors[`other_requirement_labels.${index}`]}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600">
                                    Document
                                </label>
                                <input
                                    type="file"
                                    accept={ACCEPTED_CLINIC_DOCUMENTS}
                                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-gray-700"
                                    onChange={(e) => handleOtherRequirementFile(index, e.target.files?.[0] ?? null)}
                                />
                                {row.file && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        {row.file.name} ({formatClinicDocumentSize(row.file.size)})
                                    </p>
                                )}
                                {form.errors[`other_requirement_files.${index}`] && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {form.errors[`other_requirement_files.${index}`]}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={() => removeOtherRequirement(index)}
                                    className="rounded border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
