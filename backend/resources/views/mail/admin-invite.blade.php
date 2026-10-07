{{--
    Admin invitation.

    Hand-written table HTML with inline styles for the same reason as
    otp.blade.php: Outlook's Word renderer ignores <style> blocks, so the
    layout has to be controlled directly to survive a real inbox.

    Deliberately contains no password. The recipient is sent to a link where
    they choose their own, because a credential in a mailbox is a credential
    the platform can never revoke — and this one expires and is single-use.
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
<title>You have been invited — {{ $appName }}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{{ $inviterName }} invited {{ $recipientLabel }} to the {{ $appName }} admin console.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:24px 12px;">
<tr>
<td align="center">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">

<tr>
<td style="background:{{ $brand }};padding:24px 32px;">
    @if(!empty($logoUrl))
        <img src="{{ $logoUrl }}" alt="{{ $appName }}" width="140" style="display:block;height:auto;border:0;max-height:36px;width:auto;">
    @else
        <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;"> {{ $appName }}</span>
    @endif
</td>
</tr>

<tr>
<td style="padding:32px 32px 8px 32px;">
    <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;color:{{ $ink }};letter-spacing:-0.01em;">
        You have been invited to the admin console
    </h1>

    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:{{ $muted }};">
        <strong style="color:{{ $ink }};">{{ $inviterName }}</strong> invited
        <strong style="color:{{ $ink }};">{{ $recipientLabel }}</strong> to help run
        {{ $appName }} as an administrator. Use the button below to finish creating
        the account and choose your own password.
    </p>
</td>
</tr>

<tr>
<td align="center" style="padding:8px 32px 24px 32px;">
    {{-- Table-based button rather than an <a> with padding: Outlook drops
         padding on inline-styled anchors often enough to render an unusable
         target. --}}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr>
            <td align="center" bgcolor="{{ $brand }}" style="border-radius:8px;">
                <a href="{{ $inviteUrl }}"
                   style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                    Accept the invitation
                </a>
            </td>
        </tr>
    </table>
</td>
</tr>

<tr>
<td style="padding:0 32px 20px 32px;">
    <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">
        If the button does not work, paste this link into your browser:<br>
        <a href="{{ $inviteUrl }}" style="color:{{ $brand }};word-break:break-all;">{{ $inviteUrl }}</a>
    </p>
</td>
</tr>

<tr>
<td style="padding:0 32px 24px 32px;">
    {{-- This note carries the security properties: the link dies on its own,
         and it can be killed early from the console. --}}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;width:100%;">
        <tr>
            <td style="padding:16px 18px;">
                <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#78350f;">
                    <strong>This link stops working {{ $expiresLabel }}.</strong>
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#78350f;">
                    It can only be used once. If you were not expecting this
                    invitation, ignore this email — no account exists yet, and
                    the administrator who sent it can cancel the link at any
                    time before it is used.
                </p>
            </td>
        </tr>
    </table>
</td>
</tr>

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
        You are receiving this because {{ $inviterName }} used this address on {{ $appName }}.
    </p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>
