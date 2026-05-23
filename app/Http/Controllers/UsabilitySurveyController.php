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
            ['id' => 'q1', 'text' => 'I think that I would like to use this system frequently.', 'positive' => true],
            ['id' => 'q2', 'text' => 'I found the system unnecessarily complex.', 'positive' => false],
            ['id' => 'q3', 'text' => 'I thought the system was easy to use.', 'positive' => true],
            ['id' => 'q4', 'text' => 'I think that I would need the support of a technical person to use this system.', 'positive' => false],
            ['id' => 'q5', 'text' => 'I found the various functions in this system were well integrated.', 'positive' => true],
            ['id' => 'q6', 'text' => 'I thought there was too much inconsistency in this system.', 'positive' => false],
            ['id' => 'q7', 'text' => 'I would imagine that most people would learn to use this system very quickly.', 'positive' => true],
            ['id' => 'q8', 'text' => 'I found the system very cumbersome to use.', 'positive' => false],
            ['id' => 'q9', 'text' => 'I felt very confident using the system.', 'positive' => true],
            ['id' => 'q10', 'text' => 'I needed to learn a lot of things before I could get going with this system.', 'positive' => false],
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

        return redirect()->route('survey.results')->with('success', 'Thank you! Your usability response has been recorded.');
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
