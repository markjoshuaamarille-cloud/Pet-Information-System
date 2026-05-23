<?php

namespace App\Services;

class SusScoreCalculator
{
    /**
     * Calculate System Usability Scale (SUS) score per Lewis (1995).
     * Each question is rated 1–5. Score range: 0–100.
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
            $score >= 80 => 'Excellent',
            $score >= 68 => 'Good',
            $score >= 50 => 'OK',
            default => 'Poor',
        };
    }
}
