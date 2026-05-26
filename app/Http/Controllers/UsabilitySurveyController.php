<?php

namespace App\Http\Controllers;

use App\Models\UsabilitySurvey;
use App\Services\SusScoreCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UsabilitySurveyController extends Controller
{
    public static function questions(): array
    {
        return [
            ['id' => 'q1', 'text' => 'I am satisfied with the overall quality of pet care provided by this clinic.', 'positive' => true],
            ['id' => 'q2', 'text' => 'Scheduling appointments or reaching the clinic was difficult.', 'positive' => false],
            ['id' => 'q3', 'text' => 'The staff were courteous and helpful during my visit.', 'positive' => true],
            ['id' => 'q4', 'text' => 'I experienced long wait times before being attended to.', 'positive' => false],
            ['id' => 'q5', 'text' => 'The veterinarian explained my pet\'s condition and treatment clearly.', 'positive' => true],
            ['id' => 'q6', 'text' => 'I found billing and service fees confusing or unexpected.', 'positive' => false],
            ['id' => 'q7', 'text' => 'The clinic environment was clean, safe, and comfortable for my pet.', 'positive' => true],
            ['id' => 'q8', 'text' => 'My concerns about my pet were not taken seriously by the staff.', 'positive' => false],
            ['id' => 'q9', 'text' => 'I would recommend this clinic to friends and family.', 'positive' => true],
            ['id' => 'q10', 'text' => 'I am unlikely to return to this clinic for future pet care.', 'positive' => false],
        ];
    }

    public function create(): Response
    {
        return Inertia::render('Survey/Create', [
            'questions' => self::questions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $rules = ['respondent_name' => 'nullable|string|max:255', 'comments' => 'nullable|string'];
        for ($i = 1; $i <= 10; $i++) {
            $rules["q{$i}"] = 'required|integer|min:1|max:5';
        }

        $validated = $request->validate($rules);
        $susScore = SusScoreCalculator::calculate($validated);

        UsabilitySurvey::create([
            ...$validated,
            'user_id' => $request->user()?->id,
            'sus_score' => $susScore,
        ]);

        return redirect()->route('survey.results')->with('success', 'Thank you! Your clinic service feedback has been recorded.');
    }

    public function results(): Response
    {
        $surveys = UsabilitySurvey::latest()->get();
        $average = $surveys->avg('sus_score');

        return Inertia::render('Survey/Results', [
            'surveys' => $surveys,
            'averageScore' => $average ? round($average, 2) : null,
            'interpretation' => $average ? SusScoreCalculator::interpretation($average) : null,
        ]);
    }
}
