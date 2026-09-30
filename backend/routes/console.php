<?php

use App\Console\Commands\ReconcileSubscriptions;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled work
|--------------------------------------------------------------------------
|
| Paid plans lapse on a date, not on a request, so something has to sweep for
| lapses. The sweep is idempotent and safe to run by hand at any time.
|
| `withoutOverlapping` matters here: the command writes a subscription row per
| expiring company, and two concurrent runs would collide on the unique
| `active_company_id` column. `onOneServer` additionally stops a multi-node
| deployment from running it on every node at once.
|
| Running it hourly rather than daily means an employer who upgrades at 00:05
| gets their lapse processed within the hour, not the following night. The
| reminder is still sent at most once per period, so the extra runs cost one
| indexed query each and no email.
|
| Laravel needs one scheduler entry per deployment: on a VPS or shared host
| that is a crontab line, on Windows the Task Scheduler.
|
|   * * * * * cd /path/to/hirehub/backend && php artisan schedule:run >> /dev/null 2>&1
|
*/

Schedule::command(ReconcileSubscriptions::class)
    ->hourly()
    ->withoutOverlapping()
    ->onOneServer();
