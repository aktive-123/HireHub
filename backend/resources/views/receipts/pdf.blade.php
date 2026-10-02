<!DOCTYPE html>
{{-- dompdf parses real CSS but not modern layout, so this is deliberately
     table-based and inline-styled. A remote logo URL will not load either:
     dompdf fetches it with its own client and will silently render a broken
     image, so the wordmark below is drawn in CSS rather than linked. --}}
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Receipt {{ $receipt->number }}</title>
    <style>
        @page { margin: 0; }

        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #1f2937;
            margin: 0;
            padding: 0;
        }

        table { width: 100%; border-collapse: collapse; }
        td, th { vertical-align: top; }

        .band { background: #0054ec; color: #ffffff; padding: 26px 32px; }
        .wordmark { font-size: 21px; font-weight: bold; letter-spacing: -0.4px; }
        .tagline { font-size: 10px; color: #c7dbff; margin-top: 3px; }

        .status-strip { background: #e8f7ee; padding: 9px 32px; font-size: 10px; color: #0f7a3d; }
        .status-strip.failed { background: #fdecec; color: #b42318; }

        .body { padding: 26px 32px 8px 32px; }

        .meta-table td { padding: 3px 0; font-size: 10.5px; }
        .meta-label { color: #6b7280; width: 108px; }
        .meta-value { color: #111827; font-weight: bold; }

        .rule { border-top: 1px solid #e5e7eb; margin: 20px 0; }

        .items th {
            text-align: left;
            font-size: 9.5px;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            color: #6b7280;
            border-bottom: 1px solid #e5e7eb;
            padding: 0 0 7px 0;
        }
        .items td { padding: 13px 0; border-bottom: 1px solid #f3f4f6; }
        .items .amount { text-align: right; white-space: nowrap; }
        .desc { font-weight: bold; color: #111827; }

        .totals { margin-top: 14px; }
        .totals td { padding: 3px 0; }
        .totals .label { text-align: right; color: #6b7280; }
        .totals .value { text-align: right; white-space: nowrap; }
        .totals .grand td {
            border-top: 2px solid #111827;
            font-size: 15px;
            font-weight: bold;
            padding-top: 9px;
        }

        .paid-stamp {
            background: #e8f7ee;
            color: #0f7a3d;
            border: 1px solid #a7e3c0;
            padding: 7px 15px;
            font-size: 11px;
            font-weight: bold;
        }

        .footer { padding: 18px 32px 30px 32px; font-size: 9px; color: #9ca3af; }
        .footnote { padding: 0 32px 8px 32px; font-size: 9px; color: #9ca3af; }
    </style>
</head>
<body>
<table>
    <tr>
        <td class="band">
            <div class="wordmark">HireHub</div>
            <div class="tagline">Where great teams find great people</div>
        </td>
        <td class="band" style="text-align: right; width: 220px;">
            <div style="font-size: 19px; font-weight: bold; letter-spacing: 1px;">RECEIPT</div>
            <div style="font-size: 10px; color: #c7dbff; margin-top: 3px;">{{ $receipt->number }}</div>
        </td>
    </tr>
</table>

<table>
    <tr>
        <td class="status-strip {{ $receipt->paid_at ? '' : 'failed' }}">
            @if ($receipt->paid_at)
                PAYMENT RECEIVED - thank you for your payment
            @else
                PAYMENT NOT SETTLED - no funds have been taken
            @endif
        </td>
        <td class="status-strip" style="text-align: right; width: 150px;">
            Issued {{ $issuedAt->format('j M Y') }}
        </td>
    </tr>
</table>

<div class="body">
    <table class="meta-table">
        <tr>
            <td class="meta-label">Billed to</td>
            <td class="meta-value">{{ $receipt->payer_name }}</td>
        </tr>
        <tr>
            <td class="meta-label"></td>
            <td style="color: #4b5563;">{{ $receipt->payer_email }}</td>
        </tr>
        @if ($companyName)
            <tr>
                <td class="meta-label">Company</td>
                <td class="meta-value">{{ $companyName }}</td>
            </tr>
        @endif
        <tr>
            <td class="meta-label">Payment status</td>
            <td class="meta-value">{{ $statusLabel }}</td>
        </tr>
    </table>

    <div class="rule"></div>

    <table class="items">
        <tr>
            <th>Description</th>
            <th style="text-align: right; width: 130px;">Amount</th>
        </tr>
        <tr>
            <td class="desc">{{ $receipt->item_description }}</td>
            <td class="amount">{{ $receipt->formattedAmountIso() }}</td>
        </tr>
    </table>

    <table class="totals">
        <tr>
            <td class="label">Subtotal</td>
            <td class="value">{{ $receipt->formattedAmountIso() }}</td>
        </tr>
        <tr>
            <td class="label">Tax &amp; fees</td>
            <td class="value">{{ $zeroAmount }}</td>
        </tr>
        <tr class="grand">
            <td class="label">Total paid</td>
            <td class="value">{{ $receipt->formattedAmountIso() }}</td>
        </tr>
    </table>

    <div class="rule"></div>

    <table class="meta-table">
        <tr>
            <td class="meta-label">Payment method</td>
            <td class="meta-value">{{ $gatewayLabel }}</td>
        </tr>
        <tr>
            <td class="meta-label">Transaction ID</td>
            <td class="meta-value">{{ $receipt->gateway_reference ?: 'Pending' }}</td>
        </tr>
        <tr>
            <td class="meta-label">Date &amp; time</td>
            <td class="meta-value">{{ ($receipt->paid_at ?: $issuedAt)->format('j M Y, g:i a T') }}</td>
        </tr>
        <tr>
            <td class="meta-label">Receipt number</td>
            <td class="meta-value">{{ $receipt->number }}</td>
        </tr>
    </table>

    <div style="margin-top: 18px;">
        <span class="paid-stamp">PAID</span>
    </div>
</div>

<div class="footnote">
    Generated by HireHub from transaction record #{{ $paymentId }}. This document reflects the state of the
    transaction at the time of issue. Keep the receipt number for any support query.
</div>

<div class="footer">
    HireHub - this is an automatically generated receipt and does not require a signature.
</div>
</body>
</html>
