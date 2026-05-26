import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FlashMessage from '@/Components/FlashMessage';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import { Head, Link, useForm } from '@inertiajs/react';

const labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

export default function SurveyCreate({ questions }) {
    const form = useForm({
        respondent_name: '',
        q1: 3, q2: 3, q3: 3, q4: 3, q5: 3, q6: 3, q7: 3, q8: 3, q9: 3, q10: 3,
        comments: '',
    });

    const submit = (e) => {
        e.preventDefault();
        form.post(route('survey.store'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Clinic Service Satisfaction Survey</h2>}>
            <Head title="Clinic Service Survey" />
            <div className="py-8">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <FlashMessage />
                    <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
                        <p><strong>About this survey:</strong> Help us improve our pet care services by rating your experience with appointments, staff, treatment, billing, and clinic facilities.</p>
                        <p className="mt-1">Rate each statement from 1 (Strongly Disagree) to 5 (Strongly Agree). Your satisfaction score is computed automatically (0–100).</p>
                        <Link href={route('survey.results')} className="mt-2 inline-block font-medium underline">View survey results</Link>
                    </div>
                    <form onSubmit={submit} className="space-y-6 rounded-lg bg-white p-6 shadow">
                        <div><InputLabel value="Respondent Name (optional)" /><TextInput className="mt-1 block w-full" value={form.data.respondent_name} onChange={(e) => form.setData('respondent_name', e.target.value)} /></div>
                        {questions.map((q, idx) => (
                            <fieldset key={q.id} className="border-b pb-4">
                                <legend className="mb-2 text-sm font-medium">{idx + 1}. {q.text}</legend>
                                <div className="flex flex-wrap gap-3">
                                    {[1, 2, 3, 4, 5].map((v) => (
                                        <label key={v} className="flex cursor-pointer items-center gap-1 text-xs">
                                            <input type="radio" name={q.id} value={v} checked={form.data[q.id] === v} onChange={() => form.setData(q.id, v)} />
                                            {v} — {labels[v - 1]}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        ))}
                        <div>
                            <InputLabel value="Additional Comments" />
                            <textarea className="mt-1 w-full rounded-md border-gray-300" rows={3} value={form.data.comments} onChange={(e) => form.setData('comments', e.target.value)} />
                        </div>
                        <PrimaryButton disabled={form.processing}>Submit Survey</PrimaryButton>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
