{{-- Plain-text alternative to mail.admin-invite.

     The invite link is the entire point of this message, so this variant
     leads with it. Many clients and every corporate gateway render the HTML
     part inconsistently or strip it entirely; without this the recipient
     could be left with a nicely branded email and no way to act on it. --}}
You have been invited to the admin console — {{ $appName }}

{{ $inviterName }} invited {{ $recipientLabel }} to help run {{ $appName }} as an
administrator. Use the link below to finish creating the account and choose
your own password.

    {{ $inviteUrl }}

This link stops working {{ $expiresLabel }} and can only be used once. If you
were not expecting this invitation, ignore this email — no account exists yet.

Need a hand? Contact the HireHub team: {{ $supportUrl }}

--
You are receiving this because {{ $inviterName }} used this address on {{ $appName }}.
