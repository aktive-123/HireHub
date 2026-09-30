{{-- Plain-text alternative to mail.otp.

     Many clients (and every corporate gateway) strip remote images by default.
     Without this part the branded email would arrive with a blank logo box and,
     worse, a code the user has to squint at. This variant leads with the code in
     plain text so the message is usable no matter how the HTML renders. --}}
{{ $heading }} — {{ $appName }}

@if(!empty($recipientName))
Hi {{ $recipientName }},
@else
Hi there,
@endif
{{ $intro }}

    {{ $code }}

This code expires in {{ $expiresInMinutes }} minutes and can only be used once.

@if($isReset)
If you did not ask to reset your password, no action is needed — your current
password still works and nobody has been able to change it.
@else
If you did not request this, you can ignore this email and nothing will happen.
Your account is not created until the code is entered.
@endif

Need a hand? Contact the HireHub team: {{ $supportUrl }}

--
You are receiving this because someone used this address on {{ $appName }}.
