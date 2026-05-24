import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import FlashMessage from "@/Components/FlashMessage";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import { Head, router, useForm } from "@inertiajs/react";
import { useMemo, useState } from "react";

const statuses = ["scheduled", "completed", "cancelled"];

export default function GroomingIndex({ records, pets, groomingAppointments }) {
    const [editing, setEditing] = useState(null);
    const form = useForm({
        pet_id: "",
        appointment_id: "",
        service_type: "General Grooming",
        service_date: "",
        status: "scheduled",
        notes: "",
    });

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            form.put(route("grooming.update", editing), {
                onSuccess: resetForm,
            });
            return;
        }
        form.post(route("grooming.store"), { onSuccess: resetForm });
    };

    const resetForm = () => {
        form.reset();
        form.setData("status", "scheduled");
        form.setData("service_type", "General Grooming");
        setEditing(null);
    };

    const startEdit = (record) => {
        setEditing(record.id);
        form.setData({
            pet_id: String(record.pet_id),
            appointment_id: record.appointment_id
                ? String(record.appointment_id)
                : "",
            service_type: record.service_type,
            service_date: record.service_date?.slice(0, 10) || "",
            status: record.status,
            notes: record.notes || "",
        });
    };

    const onAppointmentChange = (appointmentId) => {
        form.setData("appointment_id", appointmentId);
        if (!appointmentId) return;

        const selected = groomingAppointments.find(
            (appt) => String(appt.id) === appointmentId,
        );
        if (selected) {
            form.setData("pet_id", String(selected.pet_id));
            form.setData(
                "service_date",
                selected.scheduled_at?.slice(0, 10) || "",
            );
        }
    };

    const filteredPets = useMemo(() => {
        if (!form.data.appointment_id) {
            return pets;
        }

        const selected = groomingAppointments.find(
            (appt) => String(appt.id) === form.data.appointment_id,
        );

        if (!selected) {
            return pets;
        }

        return pets.filter((pet) => Number(pet.id) === Number(selected.pet_id));
    }, [pets, groomingAppointments, form.data.appointment_id]);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">
                    Grooming Records
                </h2>
            }
        >
            <Head title="Grooming" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    <form
                        onSubmit={submit}
                        className="mb-6 rounded-lg bg-white p-6 shadow"
                    >
                        <h3 className="mb-4 font-semibold">
                            {editing
                                ? "Edit Grooming Record"
                                : "Add Grooming Record"}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <InputLabel value="Grooming Appointment" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.appointment_id}
                                    onChange={(e) =>
                                        onAppointmentChange(e.target.value)
                                    }
                                    required
                                >
                                    <option value="">Select appointment</option>
                                    {groomingAppointments.map((appt) => (
                                        <option key={appt.id} value={appt.id}>
                                            {appt.pet?.pet_name} (
                                            {appt.client?.name}) -{" "}
                                            {new Date(
                                                appt.scheduled_at,
                                            ).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Pet" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.pet_id}
                                    onChange={(e) =>
                                        form.setData("pet_id", e.target.value)
                                    }
                                    required
                                >
                                    <option value="">Select pet</option>
                                    {filteredPets.map((pet) => (
                                        <option key={pet.id} value={pet.id}>
                                            {pet.pet_name} ({pet.client?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel value="Service Type" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={form.data.service_type}
                                    onChange={(e) =>
                                        form.setData(
                                            "service_type",
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Service Date" />
                                <TextInput
                                    type="date"
                                    className="mt-1 block w-full"
                                    value={form.data.service_date}
                                    onChange={(e) =>
                                        form.setData(
                                            "service_date",
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel value="Status" />
                                <select
                                    className="mt-1 w-full rounded-md border-gray-300"
                                    value={form.data.status}
                                    onChange={(e) =>
                                        form.setData("status", e.target.value)
                                    }
                                >
                                    {statuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-3">
                                <InputLabel value="Notes" />
                                <textarea
                                    className="mt-1 block w-full rounded-md border-gray-300"
                                    rows={3}
                                    value={form.data.notes}
                                    onChange={(e) =>
                                        form.setData("notes", e.target.value)
                                    }
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                            <PrimaryButton disabled={form.processing}>
                                Save
                            </PrimaryButton>
                            {editing && (
                                <button
                                    type="button"
                                    className="text-sm text-gray-600 hover:underline"
                                    onClick={resetForm}
                                >
                                    Cancel edit
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Pet</th>
                                    <th className="px-4 py-3 text-left">
                                        Service
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Date
                                    </th>
                                    {/* <th className="px-4 py-3 text-left">
                                        Price
                                    </th> */}
                                    <th className="px-4 py-3 text-left">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {records.map((record) => (
                                    <tr key={record.id}>
                                        <td className="px-4 py-3">
                                            {record.pet?.pet_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.service_type}
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.service_date?.slice(0, 10)}
                                        </td>
                                        {/* <td className="px-4 py-3">
                                            {record.price}
                                        </td> */}
                                        <td className="px-4 py-3 capitalize">
                                            {record.status}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                className="text-indigo-600 hover:underline"
                                                onClick={() =>
                                                    startEdit(record)
                                                }
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="ms-3 text-red-600 hover:underline"
                                                onClick={() =>
                                                    confirm(
                                                        "Delete grooming record?",
                                                    ) &&
                                                    router.delete(
                                                        route(
                                                            "grooming.destroy",
                                                            record.id,
                                                        ),
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
