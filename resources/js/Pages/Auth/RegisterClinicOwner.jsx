import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import GuestLayout from "@/Layouts/GuestLayout";
import { Head, Link, useForm } from "@inertiajs/react";

export default function RegisterClinicOwner() {
    const form = useForm({
        name: "",
        email: "",
        contact: "",
        password: "",
        password_confirmation: "",
    });

    const submit = (e) => {
        e.preventDefault();
        form.post(route("register-clinic-owner"), {
            onFinish: () => form.reset("password", "password_confirmation"),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register Your Clinic" />

            <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
                Create your clinic owner account. After you submit this form, the
                platform administrator will be notified immediately and will review
                your registration and contact you for approval before you can sign
                in.
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="name" value="Full Name" />
                    <TextInput
                        id="name"
                        name="name"
                        value={form.data.name}
                        className="mt-1 block w-full"
                        autoComplete="name"
                        isFocused
                        onChange={(e) => form.setData("name", e.target.value)}
                        required
                    />
                    <InputError message={form.errors.name} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={form.data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        onChange={(e) => form.setData("email", e.target.value)}
                        required
                    />
                    <InputError message={form.errors.email} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="contact" value="Contact Number" />
                    <TextInput
                        id="contact"
                        type="tel"
                        name="contact"
                        value={form.data.contact}
                        className="mt-1 block w-full"
                        autoComplete="tel"
                        onChange={(e) =>
                            form.setData("contact", e.target.value)
                        }
                        required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        We will use this number to contact you about your
                        account approval.
                    </p>
                    <InputError
                        message={form.errors.contact}
                        className="mt-2"
                    />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Password" />
                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={form.data.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) =>
                            form.setData("password", e.target.value)
                        }
                        required
                    />
                    <InputError
                        message={form.errors.password}
                        className="mt-2"
                    />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirm Password"
                    />
                    <TextInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={form.data.password_confirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) =>
                            form.setData(
                                "password_confirmation",
                                e.target.value,
                            )
                        }
                        required
                    />
                    <InputError
                        message={form.errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <div className="flex items-center justify-end gap-4">
                    <Link
                        href={route("login")}
                        className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Already registered?
                    </Link>

                    <PrimaryButton disabled={form.processing}>
                        Submit Registration
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
