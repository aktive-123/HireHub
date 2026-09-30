<x-mail::message>
@if($kind === \App\Mail\NewsletterMail::KIND_CONFIRMATION)
# Confirm your subscription

You asked to receive the HireHub newsletter — the latest jobs and career tips,
in one email each week.

Please confirm this address to finish signing up. If you did not request this,
you can safely ignore this email: the address will not be added to any list
until it is confirmed.

<x-mail::button :url="$actionUrl">
Confirm subscription
</x-mail::button>

This link expires in 7 days. If it has expired, just submit your address in the
site footer again to get a new one.
@else
# Confirm your unsubscribe

You asked to stop the HireHub newsletter.

<x-mail::button :url="$actionUrl">
Confirm unsubscribe
</x-mail::button>

You will keep receiving account emails about your applications and interviews.
Only the weekly newsletter stops. Changed your mind? Submit your address in the
site footer again.
@endif

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
