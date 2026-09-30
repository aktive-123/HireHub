{{--
    Branded one-time-password email.

    Hand-written HTML rather than Laravel's markdown components because the
    brief asks for the logo and the brand colour, and because mail clients are
    inconsistent enough that the layout is worth controlling directly.

    Constraints that shaped this:
      - The code is repeated in large monospace type, because it is the one
        thing the recipient must read accurately.
      - The code also appears as plain text at the top, so an email client with
        remote images disabled is still usable.
      - Table layout and inline styles throughout. Outlook's Word renderer
        ignores <style> blocks and most modern layout primitives.
      - The "if you did not request this" note is present on every send, per
        the brief, and is deliberately worded so it is reassuring rather than
        alarming.
--}}
@php
    // #0054EC mirrors --hh-primary in frontend/src/styles/tokens.css.
    $brand = '#0054ec';
    $ink = '#0f172a';
    $muted = '#64748b';
    $border = '#e2e8f0';
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{{ $heading }} — {{ $appName }}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
{{-- Preheader: the inbox preview line, hidden in the body. --}}
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your {{ $appName }} verification code is {{ $code }}. It expires in {{ $expiresInMinutes }} minutes.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:24px 12px;">
<tr>
<td align="center">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">

{{-- Brand bar --}}
<tr>
<td style="background:{{ $brand }};padding:24px 32px;">
    @if(!empty($logoUrl))
        <img src="{{ $logoUrl }}" alt="{{ $appName }}" width="140" style="display:block;height:auto;border:0;max-height:36px;width:auto;">
    @else
        <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;">{{ $appName }}</span>
    @endif
</td>
</tr>

<tr>
<td style="padding:32px 32px 8px 32px;">

    <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:{{ $ink }};letter-spacing:-0.01em;">
        {{ $heading }}
    </h1>

    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:{{ $muted }};">
        @if(!empty($recipientName))
            Hi {{ $recipientName }},
        @else
            Hi there,
        @endif
        {{ $intro }}
    </p>

</td>
</tr>

{{-- The code --}}
<tr>
<td align="center" style="padding:8px 32px 24px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
           style="background:#f8fafc;border:1px solid {{ $border }};border-radius:12px;width:100%;">
        <tr>
            <td align="center" style="padding:24px 16px;">
                <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:{{ $muted }};margin-bottom:12px;">
                    Verification code
                </div>
                <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:38px;line-height:1.1;font-weight:700;letter-spacing:0.22em;color:{{ $ink }};padding-left:0.22em;">
                    {{ $code }}
                </div>
            </td>
        </tr>
    </table>
</td>
</tr>

<tr>
<td style="padding:0 32px 24px 32px;">
    <p style="margin:0;font-size:14px;line-height:1.6;color:{{ $muted }};">
        This code expires in <strong style="color:{{ $ink }};">{{ $expiresInMinutes }} minutes</strong>
        and can only be used once.
    </p>
</td>
</tr>

@if($isReset)
<tr>
<td style="padding:0 32px 24px 32px;">
    <p style="margin:0;font-size:14px;line-height:1.6;color:{{ $muted }};">
        If you did not ask to reset your password, no action is needed — your
        current password still works and nobody has been able to change it.
    </p>
</td>
</tr>
@else
<tr>
<td style="padding:0 32px 24px 32px;">
    <p style="margin:0;font-size:14px;line-height:1.6;color:{{ $muted }};">
        If you did not request this, you can ignore this email and nothing will
        happen. Your account is not created until the code is entered.
    </p>
</td>
</tr>
@endif

<tr>
<td style="padding:0 32px 28px 32px;border-top:1px solid {{ $border }};">
    <p style="margin:20px 0 0 0;font-size:13px;line-height:1.6;color:{{ $muted }};">
        Need a hand?
        <a href="{{ $supportUrl }}" style="color:{{ $brand }};text-decoration:underline;">Contact the HireHub team</a>.
    </p>
</td>
</tr>

<tr>
<td style="background:#f8fafc;padding:20px 32px;">
    <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
        You are receiving this because someone used this address on {{ $appName }}.
    </p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>
