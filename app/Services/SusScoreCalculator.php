<?php

namespace App\Services;

class SusScoreCalculator
{
    /**
     * Calculate clinic service satisfaction score (0–100) from 10 rated items.
     */
    public static function calculate(array $responses): float
    {
        $sum = 0;

        for ($i = 1; $i <= 10; $i++) {
            $score = (int) $responses["q{$i}"];
            $sum += $i % 2 === 1 ? $score - 1 : 5 - $score;
        }

        return round($sum * 2.5, 2);
    }

    public static function interpretation(float $score): string
    {
        return match (true) {
            $score >= 80 => 'Excellent service',
            $score >= 68 => 'Good service',
            $score >= 50 => 'Fair service',
            default => 'Needs improvement',
        };
    }
}
