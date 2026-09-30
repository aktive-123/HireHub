<?php

use App\Support\FrontendUrl;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| The single-page app
|--------------------------------------------------------------------------
|
| One origin serves both the API and the web app, so the browser never makes a
| cross-origin request and CORS stays out of the way. Any GET that is not a
| real file and does not look like a path with an extension returns the app
| shell, because the router owns the URL — /employer/billing and /login are
| client-side routes with no matching file on disk, and letting them 404 would
| break every refresh and every shared link.
|
*/

Route::get('/', fn () => view('app'));

/*
 * The pattern is what keeps this from swallowing things it must not:
 *
 *   (?!api(?:/|$))  /api/* is registered in routes/api.php; letting the shell
 *                   answer for it would return HTML where a JSON error belongs.
 *   (?!.*\.)        A segment containing a dot is a file request (a JS or CSS
 *                   asset that is genuinely missing). Serving the app shell for
 *                   one produces an HTML response the browser tries to parse
 *                   as JavaScript, which is far harder to diagnose than a 404.
 *
 * The `(.*)` tail allows slashes so nested client routes such as
 * /employer/jobs/some-slug resolve to the shell.
 */
Route::get('/{path}', fn () => view('app'))
    ->where('path', '(?!api(?:/|$))(?!.*\.)(.*)')
    ->name('app');

/*
|--------------------------------------------------------------------------
| Payment return
|--------------------------------------------------------------------------
|
| Where a gateway sends the browser once the customer finishes (or abandons)
| checkout. The authoritative settlement always comes from the signed webhook,
| never from this redirect, so this route only forwards the reference to the
| frontend for it to poll.
|
*/

Route::get('/billing/return/{reference}', function (string $reference) {
    $query = http_build_query(array_filter([
        'reference' => $reference,
        'status' => request()->query('status'),
    ]));

    return redirect(FrontendUrl::to("/employer/billing?{$query}"));
})->name('payments.return');
