<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Receipt extends Model
{
    protected $fillable = [
        'payment_id',
        'number',
        'payer_name',
        'payer_email',
        'item_description',
        'amount',
        'currency',
        'gateway_reference',
        'gateway',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'paid_at' => 'datetime',
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * What the payer actually sees on the document. Amounts live in the
     * currency's minor unit (kobo for NGN) and must be divided down for
     * display; passing the raw integer would print "2500000" as if it were
     * naira.
     */
    public function formattedAmount(): string
    {
        return self::formatMinorUnits($this->amount, $this->currency);
    }

    /**
     * ISO-code form, e.g. "NGN 75,000.00".
     *
     * This is what the PDF renders. The symbol form (`formattedAmount`) is
     * correct in a browser but not necessarily in the PDF: the fonts dompdf can
     * embed do not reliably carry U+20A6 (₦), and a missing glyph is dropped
     * silently rather than substituted, which would print a bare "75,000.00"
     * with no currency at all. The ISO code always renders and cannot be
     * misread, which is also the convention on printed invoices.
     */
    public function formattedAmountIso(): string
    {
        return self::isoAmount($this->amount, $this->currency);
    }

    public static function isoAmount(int $amount, string $currency): string
    {
        return sprintf('%s %s', strtoupper($currency), self::decimalAmount($amount, $currency));
    }

    private static function decimalAmount(int $amount, string $currency): string
    {
        // Every currency we settle in uses two minor digits. Guarded rather
        // than hardcoded because a zero-decimal currency added later would
        // otherwise silently print 100x its real value.
        $divisor = match (strtoupper($currency)) {
            'JPY', 'KRW', 'VND' => 1,
            default => 100,
        };

        return number_format($amount / $divisor, $divisor === 1 ? 0 : 2);
    }

    public static function formatMinorUnits(int $amount, string $currency): string
    {
        return self::currencySymbol($currency).self::decimalAmount($amount, $currency);
    }

    private static function currencySymbol(string $currency): string
    {
        return match (strtoupper($currency)) {
            'NGN' => "\u{20A6}",
            'GHS' => "\u{20B5}",
            'ZAR' => 'R',
            'KES' => 'KSh ',
            'USD' => '$',
            'EUR' => "\u{20AC}",
            'GBP' => "\u{00A3}",
            default => strtoupper($currency).' ',
        };
    }
}
