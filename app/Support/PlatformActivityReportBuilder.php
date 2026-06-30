<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\Billing;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class PlatformActivityReportBuilder
{
    public function __construct(
        private readonly string $view = 'appointments',
        private readonly string $period = 'weekly',
        private readonly ?string $dateFrom = null,
        private readonly ?string $dateTo = null,
        private readonly ?int $clinicId = null,
        private readonly ?string $businessLine = null,
        private readonly ?string $appointmentStatus = null,
        private readonly ?string $cancellationType = null,
        private readonly ?string $billingStatus = null,
        private readonly ?string $saleType = null,
        private readonly ?string $appointmentType = null,
        private readonly ?string $search = null,
        private readonly int $perPage = 50,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $useCustomRange = (bool) ($this->dateFrom || $this->dateTo);

        return [
            'summary' => $this->summary(),
            'appointments' => $this->view === 'appointments' ? $this->paginatedAppointments() : null,
            'transactions' => $this->view === 'transactions' ? $this->paginatedTransactions() : null,
            'filters' => [
                'view' => $this->view,
                'period' => $this->period,
                'date_from' => $this->dateFrom,
                'date_to' => $this->dateTo,
                'clinic_id' => $this->clinicId,
                'business_line' => $this->businessLine,
                'appointment_status' => $this->appointmentStatus,
                'cancellation_type' => $this->cancellationType,
                'billing_status' => $this->billingStatus,
                'sale_type' => $this->saleType,
                'appointment_type' => $this->appointmentType,
                'search' => $this->search,
                'using_custom_range' => $useCustomRange,
            ],
        ];
    }

    /**
     * @return array<string, int|float>
     */
    public function summary(): array
    {
        $appointmentQuery = $this->appointmentQuery();
        $appointmentCounts = (clone $appointmentQuery)
            ->select([
                DB::raw("SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled"),
                DB::raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed"),
                DB::raw("SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled"),
                DB::raw('COUNT(*) as total'),
            ])
            ->first();

        $noShowCount = (clone $appointmentQuery)
            ->where('status', 'cancelled')
            ->where('notes', 'like', '%'.NoShowAppointmentCancellation::AUTO_CANCEL_NOTE.'%')
            ->count();

        $selfCancelledCount = (clone $appointmentQuery)
            ->where('status', 'cancelled')
            ->where('notes', 'like', '%'.AppointmentCancellationNotes::SELF_CANCEL_NOTE.'%')
            ->count();

        $billingQuery = $this->billingQuery();
        $billingTotals = (clone $billingQuery)
            ->select([
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) as unpaid"),
                DB::raw("SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial"),
                DB::raw("SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid"),
                DB::raw("SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled"),
                DB::raw('COALESCE(SUM(total_amount), 0) as total_amount'),
                DB::raw('COALESCE(SUM(amount_paid), 0) as amount_paid'),
            ])
            ->first();

        return [
            'appointments_total' => (int) ($appointmentCounts->total ?? 0),
            'appointments_scheduled' => (int) ($appointmentCounts->scheduled ?? 0),
            'appointments_completed' => (int) ($appointmentCounts->completed ?? 0),
            'appointments_cancelled' => (int) ($appointmentCounts->cancelled ?? 0),
            'appointments_no_show' => $noShowCount,
            'appointments_self_cancelled' => $selfCancelledCount,
            'billings_total' => (int) ($billingTotals->total ?? 0),
            'billings_unpaid' => (int) ($billingTotals->unpaid ?? 0),
            'billings_partial' => (int) ($billingTotals->partial ?? 0),
            'billings_paid' => (int) ($billingTotals->paid ?? 0),
            'billings_cancelled' => (int) ($billingTotals->cancelled ?? 0),
            'billings_total_amount' => round((float) ($billingTotals->total_amount ?? 0), 2),
            'billings_amount_paid' => round((float) ($billingTotals->amount_paid ?? 0), 2),
        ];
    }

    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    private function paginatedAppointments(): LengthAwarePaginator
    {
        return $this->appointmentQuery()
            ->with([
                'clinic:id,name',
                'client:id,name',
                'pet:id,pet_name',
                'billings:id,appointment_id,invoice_number,status',
            ])
            ->orderByDesc('scheduled_at')
            ->orderByDesc('id')
            ->paginate($this->perPage)
            ->through(fn (Appointment $appointment) => $this->mapAppointmentRow($appointment));
    }

    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    private function paginatedTransactions(): LengthAwarePaginator
    {
        return $this->billingQuery()
            ->with([
                'clinic:id,name',
                'client:id,name',
                'pet:id,pet_name',
                'appointment:id,status,type,scheduled_at',
                'payments:id,billing_id,method,paid_at,amount',
                'healthRecords:id,billing_id,type',
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($this->perPage)
            ->through(fn (Billing $billing) => $this->mapTransactionRow($billing));
    }

    /**
     * @return array<string, mixed>
     */
    private function mapAppointmentRow(Appointment $appointment): array
    {
        $cancellationReason = AppointmentCancellationNotes::resolveCancellationReason($appointment);

        return [
            'id' => $appointment->id,
            'clinic_id' => $appointment->clinic_id,
            'clinic_name' => $appointment->clinic?->name,
            'scheduled_at' => self::formatDateTime($appointment->scheduled_at),
            'type' => $appointment->type,
            'type_label' => self::formatAppointmentType($appointment->type),
            'status' => $appointment->status,
            'cancellation_reason' => $cancellationReason,
            'billing_status' => $appointment->billing_status,
            'client_name' => $appointment->client?->name,
            'pet_name' => $appointment->pet?->pet_name,
            'notes' => $appointment->notes,
            'invoice_numbers' => $appointment->billings
                ->pluck('invoice_number')
                ->filter()
                ->values()
                ->all(),
            'created_at' => self::formatDateTime($appointment->created_at),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapTransactionRow(Billing $billing): array
    {
        $businessLine = PlatformCommissionService::resolveBusinessLine($billing);

        return [
            'id' => $billing->id,
            'invoice_number' => $billing->invoice_number,
            'clinic_id' => $billing->clinic_id,
            'clinic_name' => $billing->clinic?->name,
            'sale_type' => $billing->sale_type ?? 'clinic_service',
            'sale_type_label' => $billing->isRetail() ? 'Pet Shop' : 'Clinic Service',
            'business_line' => $businessLine,
            'business_line_label' => self::businessLineLabel($businessLine),
            'status' => $billing->status,
            'total_amount' => (float) $billing->total_amount,
            'amount_paid' => (float) $billing->amount_paid,
            'client_name' => $billing->client?->name,
            'pet_name' => $billing->pet?->pet_name,
            'appointment_id' => $billing->appointment_id,
            'appointment_status' => $billing->appointment?->status,
            'appointment_type' => $billing->appointment?->type,
            'appointment_scheduled_at' => self::formatDateTime($billing->appointment?->scheduled_at),
            'created_at' => self::formatDateTime($billing->created_at),
            'last_payment_at' => self::formatDateTime($billing->payments->first()?->paid_at),
            'payment_methods' => $billing->payments
                ->pluck('method')
                ->filter()
                ->unique()
                ->values()
                ->all(),
        ];
    }

    private function appointmentQuery(): Builder
    {
        $query = Appointment::query()
            ->when($this->clinicId, fn ($q) => $q->where('clinic_id', $this->clinicId))
            ->when($this->appointmentStatus, fn ($q) => $q->where('status', $this->appointmentStatus))
            ->when($this->appointmentType, fn ($q) => $q->where('type', $this->appointmentType))
            ->when($this->businessLine === 'grooming', fn ($q) => $q->where('type', 'grooming'))
            ->when(
                $this->businessLine === 'veterinary',
                fn ($q) => $q->where('type', '!=', 'grooming'),
            )
            ->when($this->businessLine === 'pet_shop', fn ($q) => $q->whereRaw('1 = 0'))
            ->when($this->cancellationType === 'no_show', function ($q): void {
                $q->where('status', 'cancelled')
                    ->where('notes', 'like', '%'.NoShowAppointmentCancellation::AUTO_CANCEL_NOTE.'%');
            })
            ->when($this->cancellationType === 'self_cancelled', function ($q): void {
                $q->where('status', 'cancelled')
                    ->where('notes', 'like', '%'.AppointmentCancellationNotes::SELF_CANCEL_NOTE.'%');
            })
            ->when($this->cancellationType === 'staff_cancelled', function ($q): void {
                $q->where('status', 'cancelled')
                    ->where('notes', 'like', '%'.AppointmentCancellationNotes::STAFF_CANCEL_NOTE.'%');
            })
            ->when($this->cancellationType === 'manual', function ($q): void {
                $q->where('status', 'cancelled')
                    ->where(function ($inner): void {
                        $inner->whereNull('notes')
                            ->orWhere(function ($notesQuery): void {
                                $notesQuery
                                    ->where('notes', 'not like', '%'.NoShowAppointmentCancellation::AUTO_CANCEL_NOTE.'%')
                                    ->where('notes', 'not like', '%'.AppointmentCancellationNotes::SELF_CANCEL_NOTE.'%')
                                    ->where('notes', 'not like', '%'.AppointmentCancellationNotes::STAFF_CANCEL_NOTE.'%');
                            });
                    });
            });

        $this->applyDateRange($query, 'scheduled_at');

        if ($this->search) {
            $term = '%'.$this->search.'%';
            $query->where(function ($q) use ($term): void {
                $q->where('type', 'like', $term)
                    ->orWhere('notes', 'like', $term)
                    ->orWhereHas('clinic', fn ($c) => $c->where('name', 'like', $term))
                    ->orWhereHas('client', fn ($c) => $c->where('name', 'like', $term))
                    ->orWhereHas('pet', fn ($p) => $p->where('pet_name', 'like', $term));
            });
        }

        return $query;
    }

    private function billingQuery(): Builder
    {
        $query = Billing::query()
            ->when($this->clinicId, fn ($q) => $q->where('clinic_id', $this->clinicId))
            ->when($this->billingStatus, fn ($q) => $q->where('status', $this->billingStatus))
            ->when($this->saleType, fn ($q) => $q->where('sale_type', $this->saleType))
            ->when($this->businessLine === 'pet_shop', fn ($q) => $q->where('sale_type', 'pet_shop_retail'))
            ->when($this->businessLine === 'grooming', function ($q): void {
                $q->where(function ($inner): void {
                    $inner->whereHas('appointment', fn ($a) => $a->where('type', 'grooming'))
                        ->orWhereHas('healthRecords', fn ($hr) => $hr->where('type', 'grooming'));
                })->where('sale_type', '!=', 'pet_shop_retail');
            })
            ->when($this->businessLine === 'veterinary', function ($q): void {
                $q->where('sale_type', '!=', 'pet_shop_retail')
                    ->where(function ($inner): void {
                        $inner->whereDoesntHave('appointment')
                            ->orWhereHas('appointment', fn ($a) => $a->where('type', '!=', 'grooming'));
                    })
                    ->where(function ($inner): void {
                        $inner->whereDoesntHave('healthRecords')
                            ->orWhereHas('healthRecords', fn ($hr) => $hr->where('type', '!=', 'grooming'));
                    });
            });

        $this->applyDateRange($query, 'created_at');

        if ($this->search) {
            $term = '%'.$this->search.'%';
            $query->where(function ($q) use ($term): void {
                $q->where('invoice_number', 'like', $term)
                    ->orWhereHas('clinic', fn ($c) => $c->where('name', 'like', $term))
                    ->orWhereHas('client', fn ($c) => $c->where('name', 'like', $term))
                    ->orWhereHas('pet', fn ($p) => $p->where('pet_name', 'like', $term));
            });
        }

        return $query;
    }

    private function applyDateRange(Builder $query, string $column): void
    {
        $timezone = config('app.timezone');

        if ($this->dateFrom || $this->dateTo) {
            if ($this->dateFrom && $this->dateTo) {
                $start = Carbon::parse($this->dateFrom, $timezone)->startOfDay();
                $end = Carbon::parse($this->dateTo, $timezone)->endOfDay();
                $query->whereBetween($column, [$start, $end]);

                return;
            }

            if ($this->dateFrom) {
                $start = Carbon::parse($this->dateFrom, $timezone)->startOfDay();
                $query->where($column, '>=', $start);
            }

            if ($this->dateTo) {
                $end = Carbon::parse($this->dateTo, $timezone)->endOfDay();
                $query->where($column, '<=', $end);
            }

            return;
        }

        if (! $this->period) {
            return;
        }

        $start = match ($this->period) {
            'daily' => now($timezone)->startOfDay(),
            'weekly' => now($timezone)->startOfWeek(),
            'monthly' => now($timezone)->startOfMonth(),
            'yearly' => now($timezone)->startOfYear(),
            'all' => null,
            default => null,
        };

        if ($start) {
            $query->where($column, '>=', $start);
        }
    }

    private static function formatAppointmentType(?string $type): string
    {
        if (! $type) {
            return '—';
        }

        return ucwords(str_replace('_', ' ', $type));
    }

    private static function businessLineLabel(string $line): string
    {
        return match ($line) {
            'pet_shop' => 'Pet Shop',
            'grooming' => 'Grooming',
            default => 'Veterinary Clinic',
        };
    }

    private static function formatDateTime(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return Carbon::parse($value)
            ->timezone(config('app.timezone'))
            ->format('Y-m-d\TH:i:sP');
    }
}
