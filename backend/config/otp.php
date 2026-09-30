<?php

return [

    /*
    |--------------------------------------------------------------------------
    | One-time passwords
    |--------------------------------------------------------------------------
    |
    | Used for two independent flows, distinguished by `purpose`:
    |
    |   verify   proving ownership of an address at sign-up
    |   reset    proving ownership before a password may be changed
    |
    | Every knob is here rather than inline in the service so the limits can be
    | tuned per environment without touching logic — and so the tests and the
    | React countdown timers read the same source of truth.
    |
    */

    /*
     | Code length. Six digits is the ceiling for usability: it is long enough
     | that a 10-minute window is not trivially brute forced once the attempt
     | limiter below is applied, and short enough to dictate over the phone.
     */
    'length' => 6,

    /*
     | Lifetime. Ten minutes is long enough to find the email and short enough
     | that a code sitting in an inbox is not useful much later.
     */
    'ttl_minutes' => (int) env('OTP_TTL_MINUTES', 10),

    /*
     | Resend cooldown. Enforced server side as well as in the UI, because a
     | countdown in the browser is a suggestion, not a control.
     */
    'resend_cooldown_seconds' => (int) env('OTP_RESEND_COOLDOWN_SECONDS', 60),

    /*
     | Requests allowed per window, counted per (purpose, email, IP) and
     | separately per IP. Three per fifteen minutes is enough for someone who
     | fumbled their first couple of attempts and not enough for mail bombing.
     */
    'rate_limit_max_attempts' => (int) env('OTP_RATE_LIMIT_MAX_ATTEMPTS', 3),

    'rate_limit_decay_minutes' => (int) env('OTP_RATE_LIMIT_DECAY_MINUTES', 15),

    /*
     | Wrong-code attempts tolerated per issued code before the code is burned.
     | Six digits is a million combinations; without a cap the ten-minute
     | window is brute-forceable, with one it is not.
     */
    'max_code_attempts' => (int) env('OTP_MAX_CODE_ATTEMPTS', 5),

    /*
     | How long a verified password-reset OTP authorises the actual password
     | change. Short, because it is a bearer credential for the account.
     */
    'reset_grant_ttl_minutes' => (int) env('OTP_RESET_GRANT_TTL_MINUTES', 10),

    /*
     | Salt used to hash codes. Stored as a hash rather than plaintext so a
     | database leak does not hand over live codes; HMAC rather than a bare
     | sha256 so the six digits are not trivially brute forced offline from a
     | dump (the whole keyspace is only a million values).
     */
    'hmac_key' => env('OTP_HMAC_KEY'),

    /*
     | Purposes the API accepts, in the order they are documented.
     */
    'purposes' => ['verify', 'reset'],

];
