import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import ListDisplayControls from '@/Components/ListDisplayControls';
import useListDisplayLimit from '@/hooks/useListDisplayLimit';
import { Head, router, useForm } from '@inertiajs/react';

export default function AdminUsers({ users, roles }) {
    const form = useForm({
        name: '',
        email: '',
        role: 'customer',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        form.post(route('admin.users.store'), {
            onSuccess: () => form.reset(),
        });
    };

    const updateRole = (userId, role) => {
        router.put(route('admin.users.role.update', userId), { role });
    };

    const deleteUser = (user) => {
        if (!confirm(`Delete user ${user.name}?`)) {
            return;
        }
        router.delete(route('admin.users.destroy', user.id));
    };

    const {
        visibleItems: visibleUsers,
        displayLimit,
        setDisplayLimit,
        totalCount: userListCount,
        showingCount: userShowingCount,
    } = useListDisplayLimit(users);

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Admin User Management</h2>}>
            <Head title="Admin Users" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <FlashMessage />

                    <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-4 font-semibold">Create User</h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <InputLabel value="Name" />
                                <TextInput className="mt-1 block w-full" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                                <InputError className="mt-2" message={form.errors.name} />
                            </div>
                            <div>
                                <InputLabel value="Email" />
                                <TextInput type="email" className="mt-1 block w-full" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} required />
                                <InputError className="mt-2" message={form.errors.email} />
                            </div>
                            <div>
                                <InputLabel value="Role" />
                                <select className="mt-1 w-full rounded-md border-gray-300" value={form.data.role} onChange={(e) => form.setData('role', e.target.value)}>
                                    {roles.map((role) => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                                <InputError className="mt-2" message={form.errors.role} />
                            </div>
                            <div>
                                <InputLabel value="Password" />
                                <TextInput type="password" className="mt-1 block w-full" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} required />
                                <InputError className="mt-2" message={form.errors.password} />
                            </div>
                            <div>
                                <InputLabel value="Confirm Password" />
                                <TextInput
                                    type="password"
                                    className="mt-1 block w-full"
                                    value={form.data.password_confirmation}
                                    onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <PrimaryButton className="mt-4" disabled={form.processing}>Create User</PrimaryButton>
                    </form>

                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-left">Email</th>
                                    <th className="px-4 py-3 text-left">Role</th>
                                    <th className="px-4 py-3 text-left">Created</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {visibleUsers.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-4 py-3">{user.name}</td>
                                        <td className="px-4 py-3">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <select
                                                className="rounded-md border-gray-300 text-sm"
                                                value={user.role}
                                                onChange={(e) => updateRole(user.id, e.target.value)}
                                            >
                                                {roles.map((role) => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button className="text-red-600 hover:underline" onClick={() => deleteUser(user)}>
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <ListDisplayControls
                            totalCount={userListCount}
                            showingCount={userShowingCount}
                            displayLimit={displayLimit}
                            onLimitChange={setDisplayLimit}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
