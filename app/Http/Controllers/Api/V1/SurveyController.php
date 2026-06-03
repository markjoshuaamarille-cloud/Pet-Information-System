<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\UsabilitySurveyController as WebSurveyController;
use App\Models\UsabilitySurvey;
use App\Services\SusScoreCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Survey
 */
class SurveyController extends Controller
{
    public function create(): JsonResponse
    {
        return $this->success(['questions' => WebSurveyController::questions()]);
    }

    public function store(Request $request): JsonResponse
    {
        $rules = ['respondent_name' => 'nullable|string|max:255', 'comments' => 'nullable|string'];
        for ($i = 1; $i <= 10; $i++) {
            $rules["q{$i}"] = 'required|integer|min:1|max:5';
        }

        $validated = $request->validate($rules);
        $susScore = SusScoreCalculator::calculate($validated);

        $survey = UsabilitySurvey::create([
            ...$validated,
            'user_id' => $request->user()?->id,
            'sus_score' => $susScore,
        ]);

        return $this->created(['survey' => $survey], 'Thank you! Your clinic service feedback has been recorded.');
    }

    public function results(): JsonResponse
    {
        $surveys = UsabilitySurvey::latest()->get();
        $average = $surveys->avg('sus_score');

        return $this->success([
            'surveys' => $surveys,
            'average_score' => $average ? round($average, 2) : null,
            'interpretation' => $average ? SusScoreCalculator::interpretation($average) : null,
        ]);
    }
}
