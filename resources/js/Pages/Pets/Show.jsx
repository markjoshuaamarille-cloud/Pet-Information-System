import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import FlashMessage from "@/Components/FlashMessage";
import Modal from "@/Components/Modal";
import ImageLightbox from "@/Components/ImageLightbox";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import InputError from "@/Components/InputError";
import { Head, Link, useForm, router, usePage } from "@inertiajs/react";
import { useMemo, useRef, useState } from "react";

const types = [
    "consultation",
    "vaccination",
    "grooming",
    "medication",
    "surgery",
    "boarding",
    "emergency_care",
];
const SERVICE_DETAILS_PREFIX = "__SERVICE_FIELDS__:";
const categoryLabels = {
    medicine: "Medicine",
    supplement_vitamin: "Supplement / Vitamin",
};
const vaccinationStatusLabels = {
    up_to_date: "Up to Date",
    partial: "Partial",
    not_vaccinated: "Not Vaccinated",
    unknown: "Unknown",
};

const formatDate = (value) => {
    if (!value) {
        return null;
    }

    const iso = String(value);
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        return `${Number(month)}/${Number(day)}/${year}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleDateString();
};

const formatDateTime = (value) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

const typeLabels = {
    consultation: "Consultation",
    vaccination: "Vaccination",
    grooming: "Grooming",
    medication: "Medication",
    surgery: "Surgery",
    boarding: "Boarding / Hotel",
    emergency_care: "Emergency Care",
};

const typeSpecificSummaryFields = {
    consultation: [
        "chief_complaint",
        "symptoms",
        "diagnosis",
        "advice",
        "follow_up_date",
    ],
    vaccination: [
        "vaccine_name",
        "batch_number",
        "dosage_site",
        "administered_by",
        "booster_required",
    ],
    grooming: [
        "grooming_services",
        "special_requests",
        "groomer_name",
        "next_grooming_date",
    ],
    medication: ["instructions"],
    surgery: [
        "surgeon_name",
        "procedure_details",
        "anesthesia_used",
        "post_op_instructions",
        "stitch_removal_date",
        "next_checkup_date",
    ],
    boarding: [
        "check_in_at",
        "check_out_at",
        "boarding_days",
        "feeding_instructions",
        "special_needs",
    ],
    emergency_care: [
        "time_in",
        "chief_incident",
        "arrival_condition",
        "vital_signs",
        "immediate_treatment",
        "outcome_status",
    ],
};

const fieldLabels = {
    doctor_name: "Doctor / Vet Name",
    chief_complaint: "Chief Complaint / Reason",
    symptoms: "Symptoms",
    diagnosis: "Diagnosis / Findings",
    advice: "Advice / Recommendation",
    follow_up_date: "Next Visit / Follow-up Date",
    consult_notes: "Notes",
    vaccine_name: "Vaccine Name / Brand",
    batch_number: "Batch / Lot Number",
    dosage_site: "Dosage / Site",
    administered_by: "Vet / Nurse Name",
    booster_required: "Booster Required",
    vaccine_notes: "Notes",
    grooming_services: "Services Included",
    special_requests: "Special Requests / Notes",
    groomer_name: "Groomer Name",
    next_grooming_date: "Next Grooming Date",
    medication_title: "Medication Purpose / Title",
    instructions: "Notes / Instructions",
    surgeon_name: "Surgeon / Vet Name",
    pre_op_condition: "Pre-op Condition",
    procedure_details: "Procedure Details",
    anesthesia_used: "Anesthesia Used",
    surgery_findings: "Findings During Surgery",
    post_op_instructions: "Post-op Instructions / Care",
    prescribed_medications: "Medications Prescribed",
    stitch_removal_date: "Stitches Removal Date",
    next_checkup_date: "Next Check-up Date",
    complications_notes: "Notes / Complications",
    check_in_at: "Check-in Date & Time",
    check_out_at: "Check-out Date & Time",
    boarding_days: "Number of Days",
    feeding_instructions: "Feeding Instructions",
    boarding_medications: "Medications During Stay",
    special_needs: "Special Needs / Behavior",
    daily_log: "Daily Notes / Log",
    boarding_notes: "Notes",
    time_in: "Date & Time IN",
    chief_incident: "Chief Complaint / Incident",
    arrival_condition: "Condition on Arrival",
    vital_signs: "Vital Signs",
    immediate_treatment: "Immediate Treatment",
    emergency_diagnosis: "Diagnosis",
    procedures_done: "Procedures Done",
    outcome_status: "Outcome / Status",
    follow_up_steps: "Follow-up / Next Steps",
    emergency_notes: "Notes",
};

const groomingServiceOptions = [
    "Haircut / Style",
    "Bath - Normal",
    "Bath - Medicated",
    "Bath - Flea & Tick",
    "Nail Trim",
    "Ear Cleaning",
    "Eye Clean",
    "Dematting / Brushing",
    "Paw Balm / Cologne",
    "Others",
];

const parseServiceDetails = (description) => {
    if (!description || typeof description !== "string") {
        return { plainDescription: "", details: null };
    }

    const markerIndex = description.indexOf(SERVICE_DETAILS_PREFIX);
    if (markerIndex < 0) {
        return { plainDescription: description.trim(), details: null };
    }

    const plainDescription = description.slice(0, markerIndex).trim();
    const encoded = description
        .slice(markerIndex + SERVICE_DETAILS_PREFIX.length)
        .trim();
    try {
        const parsed = JSON.parse(encoded);
        return {
            plainDescription,
            details: parsed && typeof parsed === "object" ? parsed : null,
        };
    } catch {
        return { plainDescription: description.trim(), details: null };
    }
};

const formatDateTimeLocal = (value) => {
    if (!value) {
        return "—";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

const getRecordDetails = (record) =>
    parseServiceDetails(record.description).details ?? {};

const INTERNAL_DETAIL_FIELDS = new Set([
    "medication_lines",
    "billing_lines",
    "billing_subtotal",
    "billing_tax_enabled",
    "billing_tax_rate",
    "billing_tax_amount",
    "billing_discount",
    "medicine_name",
    "medication_quantity",
    "dosage",
]);

const isInternalDetailField = (field) =>
    INTERNAL_DETAIL_FIELDS.has(field) || field.endsWith("_user_id");

const getMedicationLinesForRecord = (record, medicinesList = []) => {
    const details = getRecordDetails(record);

    if (
        Array.isArray(details.medication_lines) &&
        details.medication_lines.length > 0
    ) {
        return details.medication_lines;
    }

    if (record.medicine) {
        return [
            {
                medicine_id: record.medicine_id,
                medicine_name: record.medicine.name,
                medication_quantity: record.medication_quantity,
                unit: record.medicine.unit,
            },
        ];
    }

    return [];
};

const formatMedicationLine = (line, medicinesList = []) => {
    const name =
        line.medicine_name ??
        medicinesList.find((m) => String(m.id) === String(line.medicine_id))
            ?.name ??
        "Unknown";
    const qty = line.medication_quantity ?? 1;
    const unit =
        line.unit ??
        medicinesList.find((m) => String(m.id) === String(line.medicine_id))
            ?.unit ??
        "";

    return `${name} · Qty: ${qty}${unit ? ` ${unit}` : ""}`;
};

const getDisplayableRecordDetails = (record) =>
    Object.fromEntries(
        Object.entries(getRecordDetails(record)).filter(
            ([field]) => !isInternalDetailField(field),
        ),
    );

function StaffSelect({
    label,
    value,
    onChange,
    staff,
    placeholder = "Select",
    emptyMessage,
}) {
    return (
        <div>
            <InputLabel value={label} />
            <select
                className="mt-1 w-full rounded-md border-gray-300"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">{placeholder}</option>
                {staff.map((member) => (
                    <option key={member.id} value={String(member.id)}>
                        {member.name}
                    </option>
                ))}
            </select>
            {staff.length === 0 && emptyMessage && (
                <p className="mt-1 text-xs text-amber-600">{emptyMessage}</p>
            )}
        </div>
    );
}

const staffMemberName = (staff, userId) => {
    if (!userId) {
        return "";
    }

    return (
        staff.find((member) => String(member.id) === String(userId))?.name ?? ""
    );
};

const resolveStaffUserId = (staff, name) => {
    if (!name) {
        return "";
    }

    const match = staff.find((member) => member.name === name);
    return match ? String(match.id) : "";
};

const toDateInput = (value) => {
    if (!value) {
        return "";
    }

    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : String(value).slice(0, 10);
};

const toDateTimeLocalInput = (value) => {
    if (!value) {
        return "";
    }

    const raw = String(value);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
        return raw.slice(0, 16);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const createBillingLine = (
    unitPrice = "",
    quantity = "1",
    source = "manual",
) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    unit_price: unitPrice,
    quantity,
    source,
});

const createMedicationLine = (medicineId = "", medicationQuantity = "1") => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    medicine_id: medicineId,
    medication_quantity: medicationQuantity,
});

const medicationLinesFromRecord = (record, details = {}) => {
    if (
        Array.isArray(details.medication_lines) &&
        details.medication_lines.length > 0
    ) {
        return details.medication_lines.map((line) =>
            createMedicationLine(
                line.medicine_id ? String(line.medicine_id) : "",
                line.medication_quantity
                    ? String(line.medication_quantity)
                    : "1",
            ),
        );
    }

    if (record.medicine_id) {
        return [
            createMedicationLine(
                String(record.medicine_id),
                record.medication_quantity
                    ? String(record.medication_quantity)
                    : "1",
            ),
        ];
    }

    return [createMedicationLine()];
};

const billingLinesFromRecord = (record, details = {}) => {
    if (
        Array.isArray(details.billing_lines) &&
        details.billing_lines.length > 0
    ) {
        return details.billing_lines.map((line) =>
            createBillingLine(
                line.unit_price !== undefined && line.unit_price !== null
                    ? String(line.unit_price)
                    : "",
                line.quantity !== undefined && line.quantity !== null
                    ? String(line.quantity)
                    : "1",
            ),
        );
    }

    if (Number(record.line_total) > 0 || Number(record.unit_price) > 0) {
        return [
            createBillingLine(
                record.unit_price !== undefined && record.unit_price !== null
                    ? String(record.unit_price)
                    : "",
                record.quantity ? String(record.quantity) : "1",
            ),
        ];
    }

    return [];
};

const billingLineSubtotal = (line) =>
    (Number(line.unit_price) || 0) * (Number(line.quantity) || 0);

const medicationLineSubtotal = (line, medicinesList) => {
    const medicine = medicinesList.find(
        (m) => String(m.id) === String(line.medicine_id),
    );

    return (
        (Number(medicine?.unit_price) || 0) *
        (Number(line.medication_quantity) || 0)
    );
};

const DEFAULT_BILLING_TAX_RATE = "12";

const billingPricingFromDetails = (details = {}) => ({
    applyTax: Boolean(details.billing_tax_enabled),
    taxRate:
        details.billing_tax_rate !== undefined &&
        details.billing_tax_rate !== null
            ? String(details.billing_tax_rate)
            : DEFAULT_BILLING_TAX_RATE,
    discountAmount:
        details.billing_discount !== undefined &&
        details.billing_discount !== null
            ? String(details.billing_discount)
            : "0",
});

const defaultHealthFormData = () => ({
    type: "consultation",
    title: "",
    description: "",
    medicine_id: "",
    dosage: "",
    medication_quantity: "",
    unit_price: "",
    quantity: "1",
    record_date: new Date().toISOString().slice(0, 10),
    next_due_date: "",
    veterinarian_notes: "",
    doctor_user_id: "",
    chief_complaint: "",
    symptoms: "",
    diagnosis: "",
    advice: "",
    follow_up_date: "",
    consult_notes: "",
    vaccine_name: "",
    batch_number: "",
    dosage_site: "",
    administered_by_user_id: "",
    booster_required: "",
    vaccine_notes: "",
    sticker_photo: null,
    remove_sticker_photo: false,
    grooming_services: [],
    special_requests: "",
    groomer_user_id: "",
    next_grooming_date: "",
    instructions: "",
    surgeon_user_id: "",
    pre_op_condition: "",
    procedure_details: "",
    anesthesia_used: "",
    surgery_findings: "",
    post_op_instructions: "",
    prescribed_medications: "",
    stitch_removal_date: "",
    next_checkup_date: "",
    complications_notes: "",
    check_in_at: "",
    check_out_at: "",
    feeding_instructions: "",
    boarding_medications: "",
    special_needs: "",
    daily_log: "",
    boarding_notes: "",
    time_in: "",
    chief_incident: "",
    arrival_condition: "",
    vital_signs: "",
    immediate_treatment: "",
    emergency_diagnosis: "",
    procedures_done: "",
    outcome_status: "",
    follow_up_steps: "",
    emergency_notes: "",
});

const sortHealthRecordsNewestFirst = (records) =>
    [...(records ?? [])].sort((a, b) => {
        const dateCompare =
            new Date(b.record_date ?? 0).getTime() -
            new Date(a.record_date ?? 0).getTime();

        if (dateCompare !== 0) {
            return dateCompare;
        }

        return (b.id ?? 0) - (a.id ?? 0);
    });

export default function PetShow({
    pet,
    medicines,
    veterinarians = [],
    groomers = [],
    servicePrices = {},
    can_manage_health_records,
}) {
    const { activeClinic, isPlatformAdmin } = usePage().props;

    const canModifyHealthRecord = (record) => {
        if (!can_manage_health_records) {
            return false;
        }

        if (isPlatformAdmin && !activeClinic?.id) {
            return true;
        }

        if (!activeClinic?.id) {
            return false;
        }

        if (!record?.clinic_id) {
            return true;
        }

        return Number(record.clinic_id) === Number(activeClinic.id);
    };

    const catalogCodeForType = (type) => type;

    const priceForType = (type) => {
        const code = catalogCodeForType(type);
        const value = servicePrices?.[code];
        return value === undefined || value === null ? "" : String(value);
    };
    const [viewingRecord, setViewingRecord] = useState(null);
    const [editingHealthRecordId, setEditingHealthRecordId] = useState(null);
    const [editingStickerPhotoUrl, setEditingStickerPhotoUrl] = useState(null);
    const [billingLines, setBillingLines] = useState([]);
    const [medicationLines, setMedicationLines] = useState([]);
    const [applyTax, setApplyTax] = useState(true);
    const [taxRate, setTaxRate] = useState(DEFAULT_BILLING_TAX_RATE);
    const [discountAmount, setDiscountAmount] = useState("0");
    const healthFormRef = useRef(null);
    const stickerPhotoInputRef = useRef(null);
    const healthForm = useForm(defaultHealthFormData());

    const resolveReferenceUnitPrice = () => {
        if (healthForm.data.type === "medication") {
            const selected = medicines.find(
                (m) => String(m.id) === String(healthForm.data.medicine_id),
            );
            return selected?.unit_price !== undefined &&
                selected?.unit_price !== null
                ? String(selected.unit_price)
                : "";
        }

        return priceForType(healthForm.data.type);
    };

    const billingSubtotal = useMemo(() => {
        const extraBilling = billingLines.reduce(
            (sum, line) => sum + billingLineSubtotal(line),
            0,
        );

        if (healthForm.data.type === "medication") {
            const medicationBilling = medicationLines.reduce(
                (sum, line) => sum + medicationLineSubtotal(line, medicines),
                0,
            );

            return medicationBilling + extraBilling;
        }

        return billingLines.reduce(
            (sum, line) => sum + billingLineSubtotal(line),
            0,
        );
    }, [billingLines, medicationLines, medicines, healthForm.data.type]);

    const computedLineTotal = useMemo(() => {
        const tax = applyTax
            ? billingSubtotal * ((Number(taxRate) || 0) / 100)
            : 0;
        const discount = Number(discountAmount) || 0;

        return Math.max(billingSubtotal + tax - discount, 0).toFixed(2);
    }, [billingSubtotal, applyTax, taxRate, discountAmount]);

    const addBillingLine = () => {
        if (healthForm.data.type === "medication") {
            healthForm.clearErrors("unit_price");
            setBillingLines((prev) => [
                ...prev,
                createBillingLine("", "1", "manual"),
            ]);
            return;
        }

        const isFirst = billingLines.length === 0;
        const unitPrice = isFirst ? resolveReferenceUnitPrice() : "";

        healthForm.clearErrors("unit_price");
        setBillingLines((prev) => [
            ...prev,
            createBillingLine(unitPrice, "1", "manual"),
        ]);
    };

    const addMedicationLine = () => {
        setMedicationLines((prev) => [...prev, createMedicationLine()]);
    };

    const updateMedicationLine = (id, field, value) => {
        setMedicationLines((prev) =>
            prev.map((line) =>
                line.id === id ? { ...line, [field]: value } : line,
            ),
        );
    };

    const removeMedicationLine = (id) => {
        setMedicationLines((prev) => {
            if (prev.length <= 1) {
                return [createMedicationLine()];
            }

            return prev.filter((line) => line.id !== id);
        });
    };

    const updateBillingLine = (id, field, value) => {
        setBillingLines((prev) =>
            prev.map((line) =>
                line.id === id ? { ...line, [field]: value } : line,
            ),
        );
    };

    const removeBillingLine = (id) => {
        setBillingLines((prev) => prev.filter((line) => line.id !== id));
    };

    const hasMedicationCharges = useMemo(
        () => medicationLines.some((line) => line.medicine_id),
        [medicationLines],
    );

    const showBillingSummary = billingLines.length > 0 || hasMedicationCharges;

    const resetTypeSpecificFields = (nextType) => {
        healthForm.setData({
            ...healthForm.data,
            type: nextType,
            description: "",
            doctor_user_id: "",
            chief_complaint: "",
            symptoms: "",
            diagnosis: "",
            advice: "",
            follow_up_date: "",
            consult_notes: "",
            vaccine_name: "",
            batch_number: "",
            dosage_site: "",
            administered_by_user_id: "",
            booster_required: "",
            vaccine_notes: "",
            sticker_photo: null,
            remove_sticker_photo: false,
            grooming_services: [],
            special_requests: "",
            groomer_user_id: "",
            next_grooming_date: "",
            medicine_id: "",
            dosage: "",
            medication_quantity: "",
            unit_price: "",
            quantity: "1",
            instructions: "",
            surgeon_user_id: "",
            pre_op_condition: "",
            procedure_details: "",
            anesthesia_used: "",
            surgery_findings: "",
            post_op_instructions: "",
            prescribed_medications: "",
            stitch_removal_date: "",
            next_checkup_date: "",
            complications_notes: "",
            check_in_at: "",
            check_out_at: "",
            feeding_instructions: "",
            boarding_medications: "",
            special_needs: "",
            daily_log: "",
            boarding_notes: "",
            time_in: "",
            chief_incident: "",
            arrival_condition: "",
            vital_signs: "",
            immediate_treatment: "",
            emergency_diagnosis: "",
            procedures_done: "",
            outcome_status: "",
            follow_up_steps: "",
            emergency_notes: "",
            veterinarian_notes: "",
            next_due_date: "",
        });

        if (billingLines.length > 0) {
            setBillingLines((prev) =>
                prev.map((line, index) =>
                    index === 0
                        ? {
                              ...line,
                              unit_price:
                                  nextType === "medication"
                                      ? ""
                                      : priceForType(nextType),
                              quantity: "1",
                          }
                        : line,
                ),
            );
        }

        if (nextType === "medication") {
            setMedicationLines([createMedicationLine()]);
        } else {
            setMedicationLines([]);
        }
    };

    const buildPayload = (data) => {
        const cleanedBase = {
            type: data.type,
            title: data.title,
            record_date: data.record_date,
            next_due_date: data.next_due_date || null,
            medicine_id:
                data.type === "medication" ? data.medicine_id || null : null,
            dosage: data.type === "medication" ? data.dosage || null : null,
            medication_quantity:
                data.type === "medication"
                    ? data.medication_quantity || null
                    : null,
        };

        const activeMedicationLines = medicationLines.filter(
            (line) => line.medicine_id,
        );
        const hasBillingContent =
            healthForm.data.type === "medication"
                ? activeMedicationLines.length > 0 || billingLines.length > 0
                : billingLines.length > 0;

        const billingSubtotalValue =
            healthForm.data.type === "medication"
                ? activeMedicationLines.reduce(
                      (sum, line) =>
                          sum + medicationLineSubtotal(line, medicines),
                      0,
                  ) +
                  billingLines.reduce(
                      (sum, line) => sum + billingLineSubtotal(line),
                      0,
                  )
                : billingLines.reduce(
                      (sum, line) => sum + billingLineSubtotal(line),
                      0,
                  );
        const taxValue = applyTax
            ? billingSubtotalValue * ((Number(taxRate) || 0) / 100)
            : 0;
        const discountValue = Number(discountAmount) || 0;
        const finalBillingTotal = Math.max(
            billingSubtotalValue + taxValue - discountValue,
            0,
        );

        if (hasBillingContent) {
            cleanedBase.unit_price = finalBillingTotal;
            cleanedBase.quantity = 1;
        } else {
            cleanedBase.unit_price =
                data.unit_price === "" ? null : data.unit_price;
            cleanedBase.quantity =
                data.type === "medication"
                    ? data.medication_quantity || 1
                    : data.quantity || 1;
        }

        let details = {};
        let notes = "";
        let plainDescription = data.description?.trim() || "";

        if (data.type === "consultation") {
            const doctorName = staffMemberName(
                veterinarians,
                data.doctor_user_id,
            );
            details = {
                doctor_name: doctorName,
                chief_complaint: data.chief_complaint,
                symptoms: data.symptoms,
                diagnosis: data.diagnosis,
                advice: data.advice,
                follow_up_date: data.follow_up_date,
            };
            notes = data.consult_notes;
            cleanedBase.next_due_date =
                data.follow_up_date || cleanedBase.next_due_date;
        } else if (data.type === "vaccination") {
            const administeredBy = staffMemberName(
                veterinarians,
                data.administered_by_user_id,
            );
            details = {
                vaccine_name: data.vaccine_name,
                batch_number: data.batch_number,
                dosage_site: data.dosage_site,
                administered_by: administeredBy,
                booster_required: data.booster_required,
            };
            notes = data.vaccine_notes;
        } else if (data.type === "grooming") {
            const groomerName = staffMemberName(groomers, data.groomer_user_id);
            details = {
                grooming_services: data.grooming_services,
                special_requests: data.special_requests,
                groomer_name: groomerName,
                next_grooming_date: data.next_grooming_date,
            };
            notes = data.special_requests;
            cleanedBase.next_due_date =
                data.next_grooming_date || cleanedBase.next_due_date;
        } else if (data.type === "medication") {
            details = {
                medication_lines: activeMedicationLines.map((line) => ({
                    medicine_id: Number(line.medicine_id),
                    medication_quantity: Number(line.medication_quantity) || 1,
                    medicine_name:
                        medicines.find(
                            (m) => String(m.id) === String(line.medicine_id),
                        )?.name ?? "",
                })),
                instructions: data.instructions,
            };
            notes = data.instructions;

            const primaryLine = activeMedicationLines[0];
            cleanedBase.medicine_id = primaryLine
                ? Number(primaryLine.medicine_id)
                : null;
            cleanedBase.medication_quantity = primaryLine
                ? Number(primaryLine.medication_quantity) || 1
                : null;
            cleanedBase.medication_lines = details.medication_lines;
            cleanedBase.dosage = null;
        } else if (data.type === "surgery") {
            const surgeonName = staffMemberName(
                veterinarians,
                data.surgeon_user_id,
            );
            details = {
                surgeon_name: surgeonName,
                pre_op_condition: data.pre_op_condition,
                procedure_details: data.procedure_details,
                anesthesia_used: data.anesthesia_used,
                surgery_findings: data.surgery_findings,
                post_op_instructions: data.post_op_instructions,
                prescribed_medications: data.prescribed_medications,
                stitch_removal_date: data.stitch_removal_date,
                next_checkup_date: data.next_checkup_date,
                complications_notes: data.complications_notes,
            };
            notes = [data.post_op_instructions, data.complications_notes]
                .filter(Boolean)
                .join("\n");
            cleanedBase.next_due_date =
                data.next_checkup_date ||
                data.stitch_removal_date ||
                cleanedBase.next_due_date;
        } else if (data.type === "boarding") {
            const checkIn = data.check_in_at
                ? new Date(data.check_in_at)
                : null;
            const checkOut = data.check_out_at
                ? new Date(data.check_out_at)
                : null;
            const boardingDays =
                checkIn && checkOut && checkOut >= checkIn
                    ? Math.max(
                          1,
                          Math.ceil(
                              (checkOut - checkIn) / (1000 * 60 * 60 * 24),
                          ),
                      )
                    : null;

            details = {
                check_in_at: data.check_in_at,
                check_out_at: data.check_out_at,
                boarding_days: boardingDays,
                feeding_instructions: data.feeding_instructions,
                boarding_medications: data.boarding_medications,
                special_needs: data.special_needs,
                daily_log: data.daily_log,
                boarding_notes: data.boarding_notes,
            };
            notes = [
                data.feeding_instructions,
                data.special_needs,
                data.boarding_notes,
            ]
                .filter(Boolean)
                .join("\n");
            cleanedBase.next_due_date = data.check_out_at
                ? String(data.check_out_at).slice(0, 10)
                : cleanedBase.next_due_date;
        } else if (data.type === "emergency_care") {
            details = {
                time_in: data.time_in,
                chief_incident: data.chief_incident,
                arrival_condition: data.arrival_condition,
                vital_signs: data.vital_signs,
                immediate_treatment: data.immediate_treatment,
                emergency_diagnosis: data.emergency_diagnosis,
                procedures_done: data.procedures_done,
                outcome_status: data.outcome_status,
                follow_up_steps: data.follow_up_steps,
                emergency_notes: data.emergency_notes,
            };
            notes = [
                data.immediate_treatment,
                data.follow_up_steps,
                data.emergency_notes,
            ]
                .filter(Boolean)
                .join("\n");
            if (data.time_in) {
                cleanedBase.record_date = String(data.time_in).slice(0, 10);
            }
        }

        if (hasBillingContent) {
            const medicationBillingEntries = activeMedicationLines.map(
                (line) => {
                    const medicine = medicines.find(
                        (m) => String(m.id) === String(line.medicine_id),
                    );

                    return {
                        unit_price: Number(medicine?.unit_price ?? 0),
                        quantity: Number(line.medication_quantity) || 1,
                        source: "medication",
                        medicine_id: Number(line.medicine_id),
                    };
                },
            );
            const manualBillingEntries = billingLines.map(
                ({ unit_price, quantity }) => ({
                    unit_price: unit_price === "" ? 0 : Number(unit_price),
                    quantity: quantity === "" ? 1 : Number(quantity),
                    source: "manual",
                }),
            );

            details.billing_lines = [
                ...medicationBillingEntries,
                ...manualBillingEntries,
            ];
            details.billing_subtotal = billingSubtotalValue;
            if (applyTax) {
                details.billing_tax_enabled = true;
                details.billing_tax_rate = Number(taxRate) || 0;
                details.billing_tax_amount = taxValue;
            }
            if (discountValue > 0) {
                details.billing_discount = discountValue;
            }
        }

        details = Object.fromEntries(
            Object.entries(details).filter(([, value]) => {
                if (Array.isArray(value)) {
                    return value.length > 0;
                }
                return (
                    value !== null &&
                    value !== undefined &&
                    String(value).trim() !== ""
                );
            }),
        );

        const encodedDetails =
            Object.keys(details).length > 0
                ? `${SERVICE_DETAILS_PREFIX}${JSON.stringify(details)}`
                : "";
        cleanedBase.description =
            [plainDescription, encodedDetails].filter(Boolean).join("\n\n") ||
            null;
        cleanedBase.veterinarian_notes =
            notes || data.veterinarian_notes || null;

        if (data.remove_sticker_photo) {
            cleanedBase.remove_sticker_photo = true;
        }

        return cleanedBase;
    };

    const populateFormFromRecord = (record) => {
        const { plainDescription, details } = parseServiceDetails(
            record.description || "",
        );
        const d = details ?? {};
        const base = {
            ...defaultHealthFormData(),
            type: record.type,
            title: record.title || "",
            description: plainDescription,
            record_date: toDateInput(record.record_date),
            next_due_date: toDateInput(record.next_due_date),
            veterinarian_notes: record.veterinarian_notes || "",
            medicine_id: record.medicine_id ? String(record.medicine_id) : "",
            dosage: record.dosage || "",
            medication_quantity: record.medication_quantity
                ? String(record.medication_quantity)
                : "",
            unit_price:
                record.unit_price !== undefined && record.unit_price !== null
                    ? String(record.unit_price)
                    : "",
            quantity: record.quantity ? String(record.quantity) : "1",
            sticker_photo: null,
            remove_sticker_photo: false,
        };

        if (record.type === "consultation") {
            Object.assign(base, {
                doctor_user_id: resolveStaffUserId(
                    veterinarians,
                    d.doctor_name,
                ),
                chief_complaint: d.chief_complaint || "",
                symptoms: d.symptoms || "",
                diagnosis: d.diagnosis || "",
                advice: d.advice || "",
                follow_up_date: toDateInput(d.follow_up_date),
                consult_notes: record.veterinarian_notes || "",
            });
        } else if (record.type === "vaccination") {
            Object.assign(base, {
                vaccine_name: d.vaccine_name || "",
                batch_number: d.batch_number || "",
                dosage_site: d.dosage_site || "",
                administered_by_user_id: resolveStaffUserId(
                    veterinarians,
                    d.administered_by,
                ),
                booster_required: d.booster_required || "",
                vaccine_notes: record.veterinarian_notes || "",
            });
        } else if (record.type === "grooming") {
            Object.assign(base, {
                grooming_services: Array.isArray(d.grooming_services)
                    ? d.grooming_services
                    : [],
                special_requests: d.special_requests || "",
                groomer_user_id: resolveStaffUserId(groomers, d.groomer_name),
                next_grooming_date: toDateInput(d.next_grooming_date),
            });
        } else if (record.type === "medication") {
            Object.assign(base, {
                instructions: d.instructions || record.veterinarian_notes || "",
            });
        } else if (record.type === "surgery") {
            Object.assign(base, {
                surgeon_user_id: resolveStaffUserId(
                    veterinarians,
                    d.surgeon_name,
                ),
                pre_op_condition: d.pre_op_condition || "",
                procedure_details: d.procedure_details || "",
                anesthesia_used: d.anesthesia_used || "",
                surgery_findings: d.surgery_findings || "",
                post_op_instructions: d.post_op_instructions || "",
                prescribed_medications: d.prescribed_medications || "",
                stitch_removal_date: toDateInput(d.stitch_removal_date),
                next_checkup_date: toDateInput(d.next_checkup_date),
                complications_notes: d.complications_notes || "",
            });
        } else if (record.type === "boarding") {
            Object.assign(base, {
                check_in_at: toDateTimeLocalInput(d.check_in_at),
                check_out_at: toDateTimeLocalInput(d.check_out_at),
                feeding_instructions: d.feeding_instructions || "",
                boarding_medications: d.boarding_medications || "",
                special_needs: d.special_needs || "",
                daily_log: d.daily_log || "",
                boarding_notes:
                    d.boarding_notes || record.veterinarian_notes || "",
            });
        } else if (record.type === "emergency_care") {
            Object.assign(base, {
                time_in: toDateTimeLocalInput(d.time_in),
                chief_incident: d.chief_incident || "",
                arrival_condition: d.arrival_condition || "",
                vital_signs: d.vital_signs || "",
                immediate_treatment: d.immediate_treatment || "",
                emergency_diagnosis: d.emergency_diagnosis || "",
                procedures_done: d.procedures_done || "",
                outcome_status: d.outcome_status || "",
                follow_up_steps: d.follow_up_steps || "",
                emergency_notes: d.emergency_notes || "",
            });
        }

        return base;
    };

    const resetHealthForm = () => {
        setEditingHealthRecordId(null);
        setEditingStickerPhotoUrl(null);
        setBillingLines([]);
        setMedicationLines([]);
        setApplyTax(true);
        setTaxRate(DEFAULT_BILLING_TAX_RATE);
        setDiscountAmount("0");
        healthForm.transform((data) => data);
        healthForm.reset();
        healthForm.setData(defaultHealthFormData());
    };

    const startEditHealthRecord = (record) => {
        if (!canModifyHealthRecord(record)) {
            return;
        }

        setEditingHealthRecordId(record.id);
        setEditingStickerPhotoUrl(record.sticker_photo_url || null);
        setViewingRecord(null);
        healthForm.clearErrors();
        const { details } = parseServiceDetails(record.description || "");
        const pricing = billingPricingFromDetails(details ?? {});
        setMedicationLines(
            record.type === "medication"
                ? medicationLinesFromRecord(record, details ?? {})
                : [],
        );
        if (Array.isArray(details?.billing_lines)) {
            setBillingLines(
                details.billing_lines
                    .filter((line) => line.source !== "medication")
                    .map((line) =>
                        createBillingLine(
                            line.unit_price !== undefined &&
                                line.unit_price !== null
                                ? String(line.unit_price)
                                : "",
                            line.quantity ? String(line.quantity) : "1",
                            "manual",
                        ),
                    ),
            );
        } else if (record.type !== "medication") {
            setBillingLines(billingLinesFromRecord(record, details ?? {}));
        } else {
            setBillingLines([]);
        }
        setApplyTax(pricing.applyTax);
        setTaxRate(pricing.taxRate);
        setDiscountAmount(pricing.discountAmount);
        healthForm.setData(populateFormFromRecord(record));
        healthFormRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    const cancelHealthEdit = () => {
        resetHealthForm();
    };

    const clearSelectedStickerPhoto = () => {
        if (stickerPhotoInputRef.current) {
            stickerPhotoInputRef.current.value = "";
        }
        healthForm.setData("sticker_photo", null);
    };

    const markExistingStickerForRemoval = () => {
        setEditingStickerPhotoUrl(null);
        healthForm.setData("remove_sticker_photo", true);
    };

    const deleteRecordSticker = (record) => {
        if (!confirm("Remove this vaccine sticker photo?")) {
            return;
        }

        router.delete(
            route("health-records.sticker.destroy", [pet.id, record.id]),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setViewingRecord((prev) => {
                        if (!prev || prev.id !== record.id) {
                            return prev;
                        }

                        return { ...prev, sticker_photo_url: null };
                    });

                    if (editingHealthRecordId === record.id) {
                        setEditingStickerPhotoUrl(null);
                        healthForm.setData("remove_sticker_photo", false);
                    }
                },
            },
        );
    };

    const addHealth = (e) => {
        e.preventDefault();

        const hasStickerPhoto = healthForm.data.sticker_photo instanceof File;
        const isEditing = Boolean(editingHealthRecordId);
        const removingSticker = Boolean(healthForm.data.remove_sticker_photo);
        const needsFormData = hasStickerPhoto || (isEditing && removingSticker);

        const submitOptions = {
            preserveScroll: true,
            onSuccess: () => {
                resetHealthForm();
            },
            onFinish: () => {
                healthForm.transform((data) => data);
            },
        };

        if (isEditing) {
            const updateRoute = route("health-records.update", [
                pet.id,
                editingHealthRecordId,
            ]);

            if (needsFormData) {
                healthForm.transform((data) => ({
                    ...buildPayload(data),
                    ...(hasStickerPhoto
                        ? { sticker_photo: data.sticker_photo }
                        : {}),
                    ...(removingSticker ? { remove_sticker_photo: "1" } : {}),
                    _method: "put",
                }));
                healthForm.post(updateRoute, {
                    ...submitOptions,
                    forceFormData: true,
                });
                return;
            }

            healthForm.transform((data) => buildPayload(data));
            healthForm.put(updateRoute, submitOptions);
            return;
        }

        if (hasStickerPhoto) {
            healthForm.transform((data) => ({
                ...buildPayload(data),
                sticker_photo: data.sticker_photo,
            }));
            healthForm.post(route("health-records.store", pet.id), {
                ...submitOptions,
                forceFormData: true,
            });
            return;
        }

        healthForm.transform((data) => buildPayload(data));
        healthForm.post(route("health-records.store", pet.id), submitOptions);
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Pet: {pet.pet_name}
                </h2>
            }
        >
            <Head title={pet.pet_name} />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    <div className="flex gap-3">
                        <Link
                            href={route("pets.index")}
                            className="text-sm text-gray-600 hover:underline"
                        >
                            ← Back
                        </Link>
                        <Link
                            href={route("pets.client-record", pet.id)}
                            className="text-sm text-indigo-600 hover:underline"
                        >
                            Print Client Record
                        </Link>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-lg bg-white p-6 shadow">
                            <h3 className="mb-3 font-semibold">
                                Pet Information
                            </h3>
                            <div className="mb-4 flex items-start gap-4">
                                {pet.photo_url ? (
                                    <ImageLightbox
                                        src={pet.photo_url}
                                        alt={pet.pet_name}
                                        title={`${pet.pet_name} — Pet Photo`}
                                        className="!h-45 !w-40"
                                    />
                                ) : (
                                    <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                                        No photo
                                    </div>
                                )}
                            </div>
                            <dl className="space-y-2 text-sm">
                                <div>
                                    <dt className="text-gray-500">Owner</dt>
                                    <dd>
                                        {pet.client?.name} —{" "}
                                        {pet.client?.contact}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">
                                        Species / Breed
                                    </dt>
                                    <dd>
                                        {pet.species}{" "}
                                        {pet.breed && `/ ${pet.breed}`}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">
                                        Age / Gender
                                    </dt>
                                    <dd>
                                        {pet.age ?? "—"} / {pet.gender ?? "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">
                                        Birth Date
                                    </dt>
                                    <dd>{formatDate(pet.birth_date) ?? "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">Weight</dt>
                                    <dd>
                                        {pet.weight ? `${pet.weight} kg` : "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">Color</dt>
                                    <dd>{pet.color || "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">
                                        Microchip No
                                    </dt>
                                    <dd>{pet.microchip_no || "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">
                                        Vaccination Status
                                    </dt>
                                    <dd>
                                        {vaccinationStatusLabels[
                                            pet.vaccination_status
                                        ] ?? "Unknown"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-gray-500">Remarks</dt>
                                    <dd>
                                        {pet.medical_history || "None recorded"}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {can_manage_health_records &&
                            isPlatformAdmin &&
                            !activeClinic?.id && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                    Select a registered clinic in the{' '}
                                    <span className="font-medium">
                                        Clinic Monitor
                                    </span>{' '}
                                    bar above to add new health records for that
                                    clinic. You can still view all records below;
                                    edit/delete any record when monitoring all
                                    clinics, or only your selected clinic&apos;s
                                    records when filtered.
                                </div>
                            )}

                        {can_manage_health_records && activeClinic?.id && (
                            <form
                                ref={healthFormRef}
                                onSubmit={addHealth}
                                className="rounded-lg bg-white p-6 shadow"
                            >
                                <h3 className="mb-3 font-semibold">
                                    {editingHealthRecordId
                                        ? "Edit Health Record"
                                        : "Add Health Record"}
                                </h3>
                                <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200">
                                    {/* <table className="min-w-full divide-y divide-gray-200 text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Type</th>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Main Specific Fields</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                                            <tr><td className="px-3 py-2">Consultation</td><td className="px-3 py-2">Symptoms, Diagnosis, Advice, Follow-up</td></tr>
                                            <tr><td className="px-3 py-2">Vaccination</td><td className="px-3 py-2">Vaccine Name, Batch No, Next Due Date</td></tr>
                                            <tr><td className="px-3 py-2">Grooming</td><td className="px-3 py-2">Services Included, Special Requests, Next Groom</td></tr>
                                            <tr><td className="px-3 py-2">Medication</td><td className="px-3 py-2">Medicine, Dosage, Quantity, Instructions</td></tr>
                                            <tr><td className="px-3 py-2">Surgery</td><td className="px-3 py-2">Procedure, Anesthesia, Post-op Care, Stitch Removal</td></tr>
                                            <tr><td className="px-3 py-2">Boarding</td><td className="px-3 py-2">Check-in/out, Feeding Rules, Behavior Notes</td></tr>
                                            <tr><td className="px-3 py-2">Emergency Care</td><td className="px-3 py-2">Time, Vital Signs, Urgent Treatment, Condition</td></tr>
                                        </tbody>
                                    </table> */}
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <InputLabel value="Type" />
                                        <select
                                            className="mt-1 w-full rounded-md border-gray-300"
                                            value={healthForm.data.type}
                                            disabled={Boolean(
                                                editingHealthRecordId,
                                            )}
                                            onChange={(e) =>
                                                resetTypeSpecificFields(
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            {types.map((t) => (
                                                <option key={t} value={t}>
                                                    {typeLabels[t] ?? t}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <InputLabel value="Title" />
                                        <TextInput
                                            className="mt-1 block w-full"
                                            value={healthForm.data.title}
                                            onChange={(e) =>
                                                healthForm.setData(
                                                    "title",
                                                    e.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Date" />
                                        <TextInput
                                            type="date"
                                            className="mt-1 block w-full"
                                            value={healthForm.data.record_date}
                                            onChange={(e) =>
                                                healthForm.setData(
                                                    "record_date",
                                                    e.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Next Due" />
                                        <TextInput
                                            type="date"
                                            className="mt-1 block w-full"
                                            value={
                                                healthForm.data.next_due_date
                                            }
                                            onChange={(e) =>
                                                healthForm.setData(
                                                    "next_due_date",
                                                    e.target.value,
                                                )
                                            }
                                            required={
                                                healthForm.data.type ===
                                                    "medication" ||
                                                healthForm.data.type ===
                                                    "vaccination"
                                            }
                                        />
                                    </div>
                                    {healthForm.data.type === "medication" && (
                                        <>
                                            <div className="sm:col-span-3 flex items-center justify-between gap-2">
                                                <InputLabel value="Medicines Used" />
                                                <button
                                                    type="button"
                                                    onClick={addMedicationLine}
                                                    title="Add medicine"
                                                    aria-label="Add medicine"
                                                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg leading-none text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            {medicationLines.map(
                                                (line, index) => (
                                                    <div
                                                        key={line.id}
                                                        className="sm:col-span-3 rounded-md border border-gray-200 bg-gray-50 p-3"
                                                    >
                                                        <div className="mb-2 flex items-center justify-between gap-2">
                                                            <p className="text-xs font-medium text-gray-700">
                                                                Medicine{" "}
                                                                {index + 1}
                                                            </p>
                                                            {medicationLines.length >
                                                                1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeMedicationLine(
                                                                            line.id,
                                                                        )
                                                                    }
                                                                    title="Remove medicine"
                                                                    aria-label="Remove medicine"
                                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm text-gray-500 hover:bg-gray-100 hover:text-red-600"
                                                                >
                                                                    ×
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                            <div>
                                                                <InputLabel value="Medicine" />
                                                                <select
                                                                    className="mt-1 w-full rounded-md border-gray-300"
                                                                    value={
                                                                        line.medicine_id
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateMedicationLine(
                                                                            line.id,
                                                                            "medicine_id",
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    required={
                                                                        index ===
                                                                        0
                                                                    }
                                                                >
                                                                    <option value="">
                                                                        Select
                                                                    </option>
                                                                    {medicines
                                                                        .filter(
                                                                            (
                                                                                m,
                                                                            ) =>
                                                                                Number(
                                                                                    m.quantity,
                                                                                ) >
                                                                                0,
                                                                        )
                                                                        .map(
                                                                            (
                                                                                m,
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        m.id
                                                                                    }
                                                                                    value={
                                                                                        m.id
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        m.name
                                                                                    }{" "}
                                                                                    (
                                                                                    {categoryLabels[
                                                                                        m
                                                                                            .category
                                                                                    ] ??
                                                                                        "Medicine"}

                                                                                    )
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <InputLabel value="Quantity Used" />
                                                                <TextInput
                                                                    type="number"
                                                                    min="1"
                                                                    className="mt-1 block w-full"
                                                                    value={
                                                                        line.medication_quantity
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        updateMedicationLine(
                                                                            line.id,
                                                                            "medication_quantity",
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    required={
                                                                        index ===
                                                                        0
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                        {line.medicine_id && (
                                                            <p className="mt-2 text-xs text-gray-500">
                                                                Line charge:{" "}
                                                                {medicationLineSubtotal(
                                                                    line,
                                                                    medicines,
                                                                ).toFixed(2)}
                                                            </p>
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Notes / Instructions" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .instructions
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "instructions",
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder='e.g. "Twice a day for 7 days", "With food only"'
                                                />
                                            </div>
                                        </>
                                    )}

                                    {healthForm.data.type ===
                                        "consultation" && (
                                        <>
                                            <StaffSelect
                                                label="Vet Name"
                                                value={
                                                    healthForm.data
                                                        .doctor_user_id
                                                }
                                                onChange={(value) =>
                                                    healthForm.setData(
                                                        "doctor_user_id",
                                                        value,
                                                    )
                                                }
                                                staff={veterinarians}
                                                placeholder="Select vet"
                                                emptyMessage="No veterinarians assigned to this clinic. Assign staff in Admin → Users."
                                            />
                                            <div>
                                                <InputLabel value="Follow-up Date" />
                                                <TextInput
                                                    type="date"
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .follow_up_date
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "follow_up_date",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Chief Complaint / Reason" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .chief_complaint
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "chief_complaint",
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Symptoms" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data.symptoms
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "symptoms",
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Diagnosis / Findings" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .diagnosis
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "diagnosis",
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Advice / Recommendation" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data.advice
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "advice",
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Notes" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .consult_notes
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "consult_notes",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                    {healthForm.data.type === "vaccination" && (
                                        <>
                                            <div>
                                                <InputLabel value="Vaccine Name / Brand" />
                                                <TextInput
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .vaccine_name
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "vaccine_name",
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Vaccine Sticker Photo" />
                                                <input
                                                    ref={stickerPhotoInputRef}
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp"
                                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                                    onChange={(e) =>
                                                        healthForm.setData({
                                                            ...healthForm.data,
                                                            sticker_photo:
                                                                e.target
                                                                    .files?.[0] ??
                                                                null,
                                                            remove_sticker_photo: false,
                                                        })
                                                    }
                                                />
                                                <InputError
                                                    message={
                                                        healthForm.errors
                                                            .sticker_photo
                                                    }
                                                    className="mt-1"
                                                />
                                                {healthForm.data
                                                    .sticker_photo instanceof
                                                File ? (
                                                    <div className="mt-2 flex items-start gap-3">
                                                        <img
                                                            src={URL.createObjectURL(
                                                                healthForm.data
                                                                    .sticker_photo,
                                                            )}
                                                            alt="Vaccine sticker preview"
                                                            className="h-32 rounded-lg border border-gray-200 object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                clearSelectedStickerPhoto
                                                            }
                                                            className="text-sm text-red-600 hover:underline"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : editingStickerPhotoUrl &&
                                                  !healthForm.data
                                                      .remove_sticker_photo ? (
                                                    <div className="mt-2 flex items-start gap-3">
                                                        <ImageLightbox
                                                            src={
                                                                editingStickerPhotoUrl
                                                            }
                                                            alt="Current vaccine sticker"
                                                            title="Current vaccine sticker"
                                                            className="h-32 rounded-lg border border-gray-200 object-cover"
                                                            hint="View current sticker"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={
                                                                markExistingStickerForRemoval
                                                            }
                                                            className="text-sm text-red-600 hover:underline"
                                                        >
                                                            Remove sticker
                                                        </button>
                                                    </div>
                                                ) : (
                                                    healthForm.data
                                                        .remove_sticker_photo && (
                                                        <p className="mt-2 text-sm text-amber-600">
                                                            Sticker will be
                                                            removed when you
                                                            save.
                                                        </p>
                                                    )
                                                )}
                                            </div>

                                            <div>
                                                <InputLabel value="Batch / Lot Number" />
                                                <TextInput
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .batch_number
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "batch_number",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Dosage / Site" />
                                                <TextInput
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .dosage_site
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "dosage_site",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <StaffSelect
                                                label="Vet Name"
                                                value={
                                                    healthForm.data
                                                        .administered_by_user_id
                                                }
                                                onChange={(value) =>
                                                    healthForm.setData(
                                                        "administered_by_user_id",
                                                        value,
                                                    )
                                                }
                                                staff={veterinarians}
                                                placeholder="Select vet"
                                                emptyMessage="No veterinarians assigned to this clinic. Assign staff in Admin → Users."
                                            />
                                            <div>
                                                <InputLabel value="Booster Required?" />
                                                <select
                                                    className="mt-1 w-full rounded-md border-gray-300"
                                                    value={
                                                        healthForm.data
                                                            .booster_required
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "booster_required",
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        Select
                                                    </option>
                                                    <option value="yes">
                                                        Yes
                                                    </option>
                                                    <option value="no">
                                                        No
                                                    </option>
                                                </select>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Notes" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .vaccine_notes
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "vaccine_notes",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                    {healthForm.data.type === "grooming" && (
                                        <>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Services Included" />
                                                <div className="mt-1 grid grid-cols-1 gap-2 rounded-md border border-gray-300 p-3 text-sm sm:grid-cols-2">
                                                    {groomingServiceOptions.map(
                                                        (option) => {
                                                            const selected =
                                                                healthForm.data.grooming_services.includes(
                                                                    option,
                                                                );
                                                            return (
                                                                <label
                                                                    key={option}
                                                                    className="flex items-center gap-2"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            selected
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) => {
                                                                            const current =
                                                                                new Set(
                                                                                    healthForm
                                                                                        .data
                                                                                        .grooming_services,
                                                                                );
                                                                            if (
                                                                                e
                                                                                    .target
                                                                                    .checked
                                                                            ) {
                                                                                current.add(
                                                                                    option,
                                                                                );
                                                                            } else {
                                                                                current.delete(
                                                                                    option,
                                                                                );
                                                                            }
                                                                            healthForm.setData(
                                                                                "grooming_services",
                                                                                Array.from(
                                                                                    current,
                                                                                ),
                                                                            );
                                                                        }}
                                                                    />
                                                                    <span>
                                                                        {option}
                                                                    </span>
                                                                </label>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                            <StaffSelect
                                                label="Groomer Name"
                                                value={
                                                    healthForm.data
                                                        .groomer_user_id
                                                }
                                                onChange={(value) =>
                                                    healthForm.setData(
                                                        "groomer_user_id",
                                                        value,
                                                    )
                                                }
                                                staff={groomers}
                                                placeholder="Select groomer"
                                                emptyMessage="No groomers assigned to this clinic. Assign staff in Admin → Users."
                                            />
                                            <div>
                                                <InputLabel value="Next Grooming Date" />
                                                <TextInput
                                                    type="date"
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .next_grooming_date
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "next_grooming_date",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Special Requests / Notes" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .special_requests
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "special_requests",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                    {healthForm.data.type === "surgery" && (
                                        <>
                                            <StaffSelect
                                                label="Vet Name"
                                                value={
                                                    healthForm.data
                                                        .surgeon_user_id
                                                }
                                                onChange={(value) =>
                                                    healthForm.setData(
                                                        "surgeon_user_id",
                                                        value,
                                                    )
                                                }
                                                staff={veterinarians}
                                                placeholder="Select vet"
                                                emptyMessage="No veterinarians assigned to this clinic. Assign staff in Admin → Users."
                                            />
                                            <div>
                                                <InputLabel value="Stitches Removal Date" />
                                                <TextInput
                                                    type="date"
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .stitch_removal_date
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "stitch_removal_date",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Next Check-up Date" />
                                                <TextInput
                                                    type="date"
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .next_checkup_date
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "next_checkup_date",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Pre-op Condition" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .pre_op_condition
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "pre_op_condition",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Procedure Details" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .procedure_details
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "procedure_details",
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Anesthesia Used" />
                                                <TextInput
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .anesthesia_used
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "anesthesia_used",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Findings During Surgery" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .surgery_findings
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "surgery_findings",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Post-op Instructions / Care" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .post_op_instructions
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "post_op_instructions",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Medications Prescribed" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .prescribed_medications
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "prescribed_medications",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Notes / Complications" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .complications_notes
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "complications_notes",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                    {healthForm.data.type === "boarding" && (
                                        <>
                                            <div>
                                                <InputLabel value="Check-in Date & Time" />
                                                <TextInput
                                                    type="datetime-local"
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .check_in_at
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "check_in_at",
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Check-out Date & Time" />
                                                <TextInput
                                                    type="datetime-local"
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .check_out_at
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "check_out_at",
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Feeding Instructions" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .feeding_instructions
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "feeding_instructions",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Medications Given During Stay" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .boarding_medications
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "boarding_medications",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Special Needs / Behavior" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .special_needs
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "special_needs",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Daily Notes / Log" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .daily_log
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "daily_log",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Notes" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .boarding_notes
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "boarding_notes",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}

                                    {healthForm.data.type ===
                                        "emergency_care" && (
                                        <>
                                            <div>
                                                <InputLabel value="Date & Time IN" />
                                                <TextInput
                                                    type="datetime-local"
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data.time_in
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "time_in",
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Condition on Arrival" />
                                                <TextInput
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .arrival_condition
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "arrival_condition",
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Critical / Stable / Conscious / Unconscious"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Chief Complaint / Incident" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .chief_incident
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "chief_incident",
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Vital Signs" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .vital_signs
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "vital_signs",
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Temp, Heart Rate, Respiration, CRT"
                                                    required
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Treatment Given Immediately" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .immediate_treatment
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "immediate_treatment",
                                                            e.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Diagnosis" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .emergency_diagnosis
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "emergency_diagnosis",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Procedures Done" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .procedures_done
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "procedures_done",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <InputLabel value="Outcome / Status" />
                                                <TextInput
                                                    className="mt-1 block w-full"
                                                    value={
                                                        healthForm.data
                                                            .outcome_status
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "outcome_status",
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Stabilized / Hospitalized / Referred"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Follow-up / Next Steps" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .follow_up_steps
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "follow_up_steps",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <InputLabel value="Notes" />
                                                <textarea
                                                    className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                                    rows={2}
                                                    value={
                                                        healthForm.data
                                                            .emergency_notes
                                                    }
                                                    onChange={(e) =>
                                                        healthForm.setData(
                                                            "emergency_notes",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="mt-3">
                                    <InputLabel value="General Description (Optional)" />
                                    <textarea
                                        className="mt-1 w-full rounded-md border-gray-300 text-sm"
                                        placeholder="Additional summary for this record"
                                        rows={2}
                                        value={healthForm.data.description}
                                        onChange={(e) =>
                                            healthForm.setData(
                                                "description",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="mt-4 rounded-md border border-indigo-100 bg-indigo-50 p-3">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                                                Billing
                                            </p>
                                            <button
                                                type="button"
                                                onClick={addBillingLine}
                                                title="Add service price line"
                                                aria-label="Add service price line"
                                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg leading-none text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                            >
                                                +
                                            </button>
                                        </div>
                                        {billingLines.length > 0 && (
                                            <p className="text-xs text-gray-500">
                                                {billingLines.length} price line
                                                {billingLines.length === 1
                                                    ? ""
                                                    : "s"}
                                            </p>
                                        )}
                                    </div>

                                    {showBillingSummary ? (
                                        <div className="space-y-3">
                                            {healthForm.data.type ===
                                                "medication" &&
                                                hasMedicationCharges && (
                                                    <p className="text-xs text-gray-600">
                                                        Medicine charges are
                                                        included in the subtotal
                                                        automatically.
                                                    </p>
                                                )}
                                            {billingLines.map((line, index) => (
                                                <div
                                                    key={line.id}
                                                    className="rounded-md border border-indigo-100 bg-white p-3"
                                                >
                                                    <div className="mb-2 flex items-center justify-between gap-2">
                                                        <p className="text-xs font-medium text-gray-700">
                                                            {healthForm.data
                                                                .type ===
                                                            "medication"
                                                                ? "Extra charge "
                                                                : "Price line "}
                                                            {index + 1}
                                                            {index === 0 &&
                                                                healthForm.data
                                                                    .type !==
                                                                    "medication" && (
                                                                    <span className="ms-1 font-normal text-gray-500">
                                                                        (catalog
                                                                        price
                                                                        applied)
                                                                    </span>
                                                                )}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeBillingLine(
                                                                    line.id,
                                                                )
                                                            }
                                                            title="Remove this price line"
                                                            aria-label="Remove this price line"
                                                            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm text-gray-500 hover:bg-gray-100 hover:text-red-600"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                    <div className="grid gap-3 sm:grid-cols-3">
                                                        <div>
                                                            <InputLabel value="Service Price" />
                                                            <TextInput
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                className="mt-1 block w-full"
                                                                value={
                                                                    line.unit_price
                                                                }
                                                                onChange={(e) =>
                                                                    updateBillingLine(
                                                                        line.id,
                                                                        "unit_price",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                        <div>
                                                            <InputLabel value="Quantity" />
                                                            <TextInput
                                                                type="number"
                                                                min="1"
                                                                className="mt-1 block w-full"
                                                                value={
                                                                    line.quantity
                                                                }
                                                                onChange={(e) =>
                                                                    updateBillingLine(
                                                                        line.id,
                                                                        "quantity",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <InputLabel value="Subtotal" />
                                                            <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">
                                                                {billingLineSubtotal(
                                                                    line,
                                                                ).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="space-y-3 rounded-md border border-indigo-200 bg-white px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                                                    <label className="inline-flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={applyTax}
                                                            onChange={(e) =>
                                                                setApplyTax(
                                                                    e.target
                                                                        .checked,
                                                                )
                                                            }
                                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-gray-700">
                                                            Tax
                                                        </span>
                                                        <TextInput
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            className="w-16 py-1 text-sm"
                                                            value={taxRate}
                                                            onChange={(e) =>
                                                                setTaxRate(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            disabled={!applyTax}
                                                        />
                                                        <span className="text-gray-500">
                                                            %
                                                        </span>
                                                    </label>
                                                    <label className="inline-flex items-center gap-2">
                                                        <span className="text-gray-700">
                                                            Discount
                                                        </span>
                                                        <TextInput
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            className="w-24 py-1 text-sm"
                                                            value={
                                                                discountAmount
                                                            }
                                                            onChange={(e) =>
                                                                setDiscountAmount(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="0.00"
                                                        />
                                                    </label>
                                                </div>
                                                <div className="flex items-center justify-between border-t border-indigo-100 pt-3">
                                                    <div>
                                                        <span className="text-sm font-semibold text-indigo-900">
                                                            Line Total
                                                        </span>
                                                        {billingLines.length >
                                                            0 && (
                                                            <p className="mt-0.5 text-xs text-gray-500">
                                                                Subtotal{" "}
                                                                {billingSubtotal.toFixed(
                                                                    2,
                                                                )}
                                                                {applyTax &&
                                                                    ` + Tax ${(
                                                                        billingSubtotal *
                                                                        ((Number(
                                                                            taxRate,
                                                                        ) ||
                                                                            0) /
                                                                            100)
                                                                    ).toFixed(
                                                                        2,
                                                                    )}`}
                                                                {Number(
                                                                    discountAmount,
                                                                ) > 0 &&
                                                                    ` - Discount ${Number(
                                                                        discountAmount,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}`}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-lg font-bold text-indigo-900">
                                                        {computedLineTotal}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500">
                                            {healthForm.data.type ===
                                            "medication"
                                                ? "Select medicines above to include their inventory prices in the line total. Press + here to add extra charges."
                                                : "Optional. Press + to add a service price line. Add more lines for extra charges — the total updates automatically."}
                                        </p>
                                    )}
                                </div>
                                <InputError
                                    message={healthForm.errors.type}
                                    className="mt-2"
                                />
                                <InputError
                                    message={healthForm.errors.title}
                                    className="mt-2"
                                />
                                <InputError
                                    message={healthForm.errors.record_date}
                                    className="mt-2"
                                />
                                <InputError
                                    message={healthForm.errors.next_due_date}
                                    className="mt-2"
                                />
                                <InputError
                                    message={healthForm.errors.medicine_id}
                                    className="mt-2"
                                />
                                <InputError
                                    message={
                                        healthForm.errors.medication_quantity
                                    }
                                    className="mt-2"
                                />
                                <InputError
                                    message={healthForm.errors.unit_price}
                                    className="mt-2"
                                />
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <PrimaryButton
                                        disabled={healthForm.processing}
                                    >
                                        {editingHealthRecordId
                                            ? "Update Record"
                                            : "Add Record"}
                                    </PrimaryButton>
                                    {editingHealthRecordId && (
                                        <SecondaryButton
                                            type="button"
                                            onClick={cancelHealthEdit}
                                            disabled={healthForm.processing}
                                        >
                                            Cancel
                                        </SecondaryButton>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-4 font-semibold">
                            Checkup & Health History
                        </h3>
                        {pet.health_records?.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                No health records yet.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {sortHealthRecordsNewestFirst(
                                    pet.health_records,
                                ).map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex items-start justify-between border-b pb-3 text-sm"
                                    >
                                        <div>
                                            <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                                                {typeLabels[r.type] ?? r.type}
                                            </span>
                                            <strong className="ms-2">
                                                {r.title}
                                            </strong>
                                            <p className="text-gray-500">
                                                {formatDate(r.record_date)}
                                                {r.next_due_date &&
                                                    ` · Next due: ${formatDate(r.next_due_date)}`}
                                                {r.created_at &&
                                                    ` · Logged ${formatDateTime(r.created_at)}`}
                                            </p>
                                            {(r.clinic?.name || r.clinic_id) && (
                                                <p className="mt-0.5 text-xs text-gray-500">
                                                    Recorded at:{" "}
                                                    {r.clinic?.name ??
                                                        `Clinic #${r.clinic_id}`}
                                                    {!canModifyHealthRecord(r) && (
                                                        <span className="ms-2 rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                                                            View only
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                            {Object.entries(
                                                getDisplayableRecordDetails(r),
                                            )
                                                .filter(([field]) =>
                                                    (
                                                        typeSpecificSummaryFields[
                                                            r.type
                                                        ] ?? []
                                                    ).includes(field),
                                                )
                                                .slice(0, 2)
                                                .map(([field, value]) => (
                                                    <p
                                                        key={field}
                                                        className="text-gray-600"
                                                    >
                                                        {fieldLabels[field] ??
                                                            field}
                                                        :{" "}
                                                        {Array.isArray(value)
                                                            ? value.join(", ")
                                                            : String(value)}
                                                    </p>
                                                ))}
                                            {(() => {
                                                const medLines =
                                                    getMedicationLinesForRecord(
                                                        r,
                                                        medicines,
                                                    );

                                                if (medLines.length === 0) {
                                                    return null;
                                                }

                                                return (
                                                    <p>
                                                        {medLines.length > 1
                                                            ? "Medicines: "
                                                            : "Medicine: "}
                                                        {medLines
                                                            .map((line) =>
                                                                formatMedicationLine(
                                                                    line,
                                                                    medicines,
                                                                ),
                                                            )
                                                            .join("; ")}
                                                    </p>
                                                );
                                            })()}
                                            {r.veterinarian_notes && (
                                                <p>{r.veterinarian_notes}</p>
                                            )}
                                            {Number(r.line_total) > 0 && (
                                                <p className="font-medium text-gray-700">
                                                    Charge:{" "}
                                                    {Number(
                                                        r.line_total,
                                                    ).toFixed(2)}
                                                    {r.billing_id ? (
                                                        <span className="ms-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                                                            Invoiced
                                                        </span>
                                                    ) : (
                                                        <span className="ms-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                                                            Unbilled
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                            {r.sticker_photo_url && (
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <ImageLightbox
                                                        src={
                                                            r.sticker_photo_url
                                                        }
                                                        alt={`${r.title} vaccine sticker`}
                                                        title={`${r.title} — Vaccine Sticker`}
                                                        className="h-14 w-14 rounded border border-gray-200 object-cover"
                                                        hint="View sticker"
                                                    />
                                                    <span className="text-gray-600">
                                                        Vaccine sticker attached
                                                    </span>
                                                    {canModifyHealthRecord(r) && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                deleteRecordSticker(
                                                                    r,
                                                                )
                                                            }
                                                            className="text-sm text-red-600 hover:underline"
                                                        >
                                                            Remove sticker
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setViewingRecord(r)
                                                }
                                                className="text-indigo-600 hover:underline"
                                            >
                                                View
                                            </button>
                                            {canModifyHealthRecord(r) && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            startEditHealthRecord(
                                                                r,
                                                            )
                                                        }
                                                        className="text-amber-600 hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            confirm(
                                                                "Delete?",
                                                            ) &&
                                                            router.delete(
                                                                route(
                                                                    "health-records.destroy",
                                                                    [
                                                                        pet.id,
                                                                        r.id,
                                                                    ],
                                                                ),
                                                            )
                                                        }
                                                        className="text-red-600 hover:underline"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Modal
                        show={!!viewingRecord}
                        onClose={() => setViewingRecord(null)}
                        maxWidth="lg"
                    >
                        {viewingRecord && (
                            <div className="p-6">
                                <div className="mb-4 flex items-start justify-between gap-4">
                                    <div>
                                        <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                                            {typeLabels[viewingRecord.type] ??
                                                viewingRecord.type}
                                        </span>
                                        <h3 className="mt-2 text-lg font-semibold text-gray-900">
                                            {viewingRecord.title}
                                        </h3>
                                        {(viewingRecord.clinic?.name ||
                                            viewingRecord.clinic_id) && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                Recorded at:{" "}
                                                {viewingRecord.clinic?.name ??
                                                    `Clinic #${viewingRecord.clinic_id}`}
                                                {!canModifyHealthRecord(
                                                    viewingRecord,
                                                ) && (
                                                    <span className="ms-2 rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                                                        View only
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                    <SecondaryButton
                                        type="button"
                                        onClick={() => setViewingRecord(null)}
                                    >
                                        Close
                                    </SecondaryButton>
                                </div>

                                <dl className="space-y-3 text-sm">
                                    <div>
                                        <dt className="text-gray-500">
                                            Record Date
                                        </dt>
                                        <dd>
                                            {formatDate(
                                                viewingRecord.record_date,
                                            ) ?? "—"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500">
                                            Next Due
                                        </dt>
                                        <dd>
                                            {formatDate(
                                                viewingRecord.next_due_date,
                                            ) ?? "—"}
                                        </dd>
                                    </div>
                                    {viewingRecord.description && (
                                        <div>
                                            <dt className="text-gray-500">
                                                Description
                                            </dt>
                                            <dd className="whitespace-pre-wrap">
                                                {parseServiceDetails(
                                                    viewingRecord.description,
                                                ).plainDescription || "—"}
                                            </dd>
                                        </div>
                                    )}
                                    {Object.keys(
                                        getDisplayableRecordDetails(
                                            viewingRecord,
                                        ),
                                    ).length > 0 && (
                                        <div>
                                            <dt className="text-gray-500">
                                                Service-specific Details
                                            </dt>
                                            <dd>
                                                <div className="mt-1 grid gap-2 rounded-md border border-gray-200 p-3">
                                                    {Object.entries(
                                                        getDisplayableRecordDetails(
                                                            viewingRecord,
                                                        ),
                                                    ).map(([field, value]) => (
                                                        <div key={field}>
                                                            <p className="text-xs uppercase tracking-wide text-gray-500">
                                                                {fieldLabels[
                                                                    field
                                                                ] ?? field}
                                                            </p>
                                                            <p className="whitespace-pre-wrap text-gray-900">
                                                                {field ===
                                                                    "check_in_at" ||
                                                                field ===
                                                                    "check_out_at" ||
                                                                field ===
                                                                    "time_in"
                                                                    ? formatDateTimeLocal(
                                                                          value,
                                                                      )
                                                                    : Array.isArray(
                                                                            value,
                                                                        )
                                                                      ? value.join(
                                                                            ", ",
                                                                        )
                                                                      : String(
                                                                            value,
                                                                        )}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </dd>
                                        </div>
                                    )}
                                    {getMedicationLinesForRecord(
                                        viewingRecord,
                                        medicines,
                                    ).length > 0 && (
                                        <div>
                                            <dt className="text-gray-500">
                                                {getMedicationLinesForRecord(
                                                    viewingRecord,
                                                    medicines,
                                                ).length > 1
                                                    ? "Medicines"
                                                    : "Medicine"}
                                            </dt>
                                            <dd>
                                                <ul className="list-disc space-y-1 pl-5">
                                                    {getMedicationLinesForRecord(
                                                        viewingRecord,
                                                        medicines,
                                                    ).map((line, index) => (
                                                        <li key={index}>
                                                            {formatMedicationLine(
                                                                line,
                                                                medicines,
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </dd>
                                        </div>
                                    )}
                                    {Number(viewingRecord.line_total) > 0 && (
                                        <div>
                                            <dt className="text-gray-500">
                                                Billing
                                            </dt>
                                            <dd>
                                                {(() => {
                                                    const billingDetails =
                                                        getRecordDetails(
                                                            viewingRecord,
                                                        );
                                                    const subtotal =
                                                        billingDetails.billing_subtotal;
                                                    const taxAmount =
                                                        billingDetails.billing_tax_amount;
                                                    const discount =
                                                        billingDetails.billing_discount;

                                                    if (
                                                        subtotal !== undefined
                                                    ) {
                                                        return (
                                                            <>
                                                                <p>
                                                                    Subtotal:{" "}
                                                                    {Number(
                                                                        subtotal,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
                                                                    {taxAmount >
                                                                        0 &&
                                                                        ` · Tax: ${Number(taxAmount).toFixed(2)}`}
                                                                    {discount >
                                                                        0 &&
                                                                        ` · Discount: ${Number(discount).toFixed(2)}`}
                                                                </p>
                                                                <p className="mt-1 font-semibold">
                                                                    Total:{" "}
                                                                    {Number(
                                                                        viewingRecord.line_total,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
                                                                    {viewingRecord.billing_id
                                                                        ? " (Invoiced)"
                                                                        : " (Unbilled)"}
                                                                </p>
                                                            </>
                                                        );
                                                    }

                                                    return (
                                                        <>
                                                            {Number(
                                                                viewingRecord.unit_price,
                                                            ).toFixed(2)}{" "}
                                                            ×{" "}
                                                            {viewingRecord.quantity ??
                                                                1}{" "}
                                                            ={" "}
                                                            <span className="font-semibold">
                                                                {Number(
                                                                    viewingRecord.line_total,
                                                                ).toFixed(2)}
                                                            </span>
                                                            {viewingRecord.billing_id
                                                                ? " (Invoiced)"
                                                                : " (Unbilled)"}
                                                        </>
                                                    );
                                                })()}
                                            </dd>
                                        </div>
                                    )}
                                    {viewingRecord.sticker_photo_url && (
                                        <div>
                                            <dt className="text-gray-500">
                                                Vaccine Sticker
                                            </dt>
                                            <dd>
                                                <div className="mt-1 flex flex-wrap items-start gap-3">
                                                    <ImageLightbox
                                                        src={
                                                            viewingRecord.sticker_photo_url
                                                        }
                                                        alt="Vaccine sticker"
                                                        title={`${viewingRecord.title} — Vaccine Sticker`}
                                                        className="max-h-64 max-w-full rounded-lg border border-gray-200 object-contain"
                                                        hint="Click to zoom"
                                                    />
                                                    {canModifyHealthRecord(viewingRecord) && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                deleteRecordSticker(
                                                                    viewingRecord,
                                                                )
                                                            }
                                                            className="text-sm text-red-600 hover:underline"
                                                        >
                                                            Remove sticker
                                                        </button>
                                                    )}
                                                </div>
                                            </dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-gray-500">
                                            Veterinarian Notes
                                        </dt>
                                        <dd className="whitespace-pre-wrap">
                                            {viewingRecord.veterinarian_notes ||
                                                "—"}
                                        </dd>
                                    </div>
                                    {viewingRecord.created_at && (
                                        <div>
                                            <dt className="text-gray-500">
                                                Logged
                                            </dt>
                                            <dd>
                                                {formatDateTime(
                                                    viewingRecord.created_at,
                                                )}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        )}
                    </Modal>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
