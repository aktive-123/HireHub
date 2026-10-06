{{-- Plain-text alternative to mail.password-reset-by-admin.

     The reset link is the entire point of this message, so this variant leads
     with it. Many clients and every corporate gateway render the HTML part
     inconsistently or strip it entirely; without this the recipient could be
     left with a nicely branded email and no way to act on it. --}}
Your password was reset — {{ $appName }}

@if(!empty($recipientName))
Hi {{ $recipientName }},
@else
Hi there,
@endif
{{ $adminName }} reset the password on your {{ $appName }} account. Use the link
below to choose a new one.

    {{ $resetUrl }}

Your previous password no longer works and every signed-in device has been
signed out. If you did not expect this, contact support straight away and do
not create an account with the same address.

Need a hand? Contact the HireHub team: {{ $supportUrl }}

--
You are receiving this because someone used this address on {{ $appName }}.