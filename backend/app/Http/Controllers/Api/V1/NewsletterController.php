<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Mail\NewsletterMail;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;

class NewsletterController extends ApiController
{
    /**
     * Collect a newsletter signup.
     *
     * Double opt-in: the row is written as `pending` and nothing is ever sent
     * to the address until the emailed link is followed. That is what stops
     * this public, unauthenticated endpoint from being usable to mail someone
     * else's inbox, and it keeps us out of the spam folder.
     *
     * The response is deliberately identical whether the address is new,
     * already pending, or already confirmed, so the endpoint cannot be used to
     * probe whether a given person is on the list. That means the status code,
     * the wording, and the body all have to stay the same too — a 201 for a new
     * row against a 200 for an existing one is itself an oracle.
     *
     * The wording is therefore conditional ("if that address can receive mail")
     * rather than a claim that a message was sent, because for an address that
     * is already confirmed we deliberately send nothing.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email:filter', 'max:255'],
            'source' => ['nullable', 'string', 'max:50'],
        ]);

        $email = NewsletterSubscriber::normaliseEmail($validated['email']);
        $subscriber = NewsletterSubscriber::firstOrNew(['email' => $email]);

        // An already-confirmed address is left completely alone: re-subscribing
        // someone who never opted out would be a way to overwrite their choice.
        // Note the early return is not needed — beginConfirmation() is skipped
        // for a confirmed row below, and both paths answer the same thing.
        $alreadyConfirmed = $subscriber->exists
            && $subscriber->status === NewsletterSubscriber::STATUS_CONFIRMED;

        if (! $alreadyConfirmed) {
            $subscriber->email = $email;
            $subscriber->source = $validated['source'] ?? $subscriber->source ?? 'footer';
            // Covers a first signup, a resend of a lapsed link, and
            // re-subscribing after an opt-out.
            $subscriber->beginConfirmation();

            $this->sendConfirmation($subscriber);
        }

        return $this->success(
            null,
            'Almost there — if that address can receive mail, a confirmation link is on its way.'
        );
    }

    /**
     * Complete a subscription from the emailed link.
     *
     * The token is a bearer secret delivered by email, so a wrong or guessed
     * one is a 404 rather than a redirect: an invalid link should not confirm
     * anything, and should not confirm that it failed either.
     */
    public function confirm(Request $request, string $token): JsonResponse
    {
        $subscriber = NewsletterSubscriber::where('confirmation_token', $token)->first();

        if (! $subscriber) {
            throw ValidationException::withMessages([
                'token' => ['That confirmation link is invalid or has already been used.'],
            ]);
        }

        // Re-following an already-confirmed link is harmless but should still
        // report success, otherwise a user who clicks twice sees an error.
        if ($subscriber->status !== NewsletterSubscriber::STATUS_CONFIRMED) {
            $subscriber->confirm();
        }

        return $this->success([
            'status' => $subscriber->status,
        ], 'Your newsletter subscription is confirmed.');
    }

    /**
     * Stop the newsletter from the link in an outgoing email.
     *
     * This one IS reachable by email clients (the List-Unsubscribe header), so
     * it uses a temporary signed URL and reports a generic success either way —
     * a one-click unsubscribe must not depend on reading a response body.
     */
    public function unsubscribe(Request $request, string $token): JsonResponse
    {
        $subscriber = NewsletterSubscriber::where('unsubscribe_token', $token)->first();

        if ($subscriber && $subscriber->status !== NewsletterSubscriber::STATUS_UNSUBSCRIBED) {
            $subscriber->unsubscribe();
        }

        return $this->success(null, 'You have been unsubscribed from the HireHub newsletter.');
    }

    private function sendConfirmation(NewsletterSubscriber $subscriber): void
    {
        $url = URL::temporarySignedRoute(
            'newsletter.confirm',
            now()->addDays(7),
            ['token' => $subscriber->confirmation_token],
        );

        // With MAIL_ENABLED=false the app is running without a mail provider
        // (the default MAIL_MAILER is 'log'), so the link would otherwise be
        // unreachable and the flow impossible to test locally. Logging it
        // matches how password-reset links are surfaced in development.
        if (! config('mail.enabled', false)) {
            Log::info('Newsletter confirmation link (mail delivery disabled).', [
                'email' => $subscriber->email,
                'url' => $url,
            ]);

            return;
        }

        try {
            Mail::to($subscriber->email)->queue(
                new NewsletterMail(NewsletterMail::KIND_CONFIRMATION, $url)
            );
        } catch (\Throwable $e) {
            // A signup must not 500 because the mail provider is briefly down:
            // the row is stored and the user can request another link.
            report($e);
        }
    }
}
