<x-mail::message>
# {{ $payload['title'] ?? 'HireHub' }}

{{ $payload['text'] ?? '' }}

@if(!empty($payload['action']))
<x-mail::button :url="$payload['link'] ?? url('/')">
{{ $payload['action'] }}
</x-mail::button>
@endif

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>