import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import { Head, Link } from '@inertiajs/react';

export default function SurveyResults({ surveys, averageScore, interpretation }) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Clinic Service Survey Results</h2>}>
            <Head title="Clinic Service Survey Results" />
            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    <Link href={route('survey.create')} className="mb-4 inline-block text-sm text-indigo-600 hover:underline">Take survey</Link>
                    {averageScore !== null && (
                        <div className="mb-6 rounded-lg bg-indigo-600 p-6 text-white">
                            <p className="text-sm opacity-80">Average Service Satisfaction Score</p>
                            <p className="text-4xl font-bold">{averageScore} / 100</p>
                            <p className="mt-1">Rating: <strong>{interpretation}</strong></p>
                            <p className="mt-2 text-xs opacity-80">Benchmark: ≥68 = good service; ≥80 = excellent service</p>
                        </div>
                    )}
                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Respondent</th><th className="px-4 py-3 text-left">Satisfaction Score</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Comments</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                                {surveys.length === 0 ? (
                                    <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No responses yet.</td></tr>
                                ) : surveys.map((s) => (
                                    <tr key={s.id}>
                                        <td className="px-4 py-3">{s.respondent_name || 'Anonymous'}</td>
                                        <td className="px-4 py-3 font-semibold">{s.sus_score}</td>
                                        <td className="px-4 py-3">{new Date(s.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">{s.comments || '—'}</td>
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
