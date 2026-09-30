<?php

namespace Tests\Feature;

use App\Mail\NewsletterMail;
use App\Models\NewsletterSubscriber;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Tests\ApiTestCase;

class NewsletterTest extends ApiTestCase
{
    /*
     * The controller only sends mail when config('mail.enabled') is true, so
     * each test states which world it is in rather than relying on whatever
     * the developer's .env happens to say.
     */
    private function withMailEnabled(bool $enabled = true): void
    {
        config(['mail.enabled' => $enabled, 'mail.default' => 'array']);
    }

    public function test_a_visitor_can_subscribe(): void
    {
        $this->withMailEnabled();

        $this->postJson('/api/v1/newsletter/subscribe', [
            'email' => 'reader@example.com',
            'source' => 'footer',
        ])
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('newsletter_subscribers', [
            'email' => 'reader@example.com',
            'status' => NewsletterSubscriber::STATUS_PENDING,
            'source' => 'footer',
        ]);
    }

    public function test_a_new_signup_is_not_mailed_to_before_it_is_confirmed(): void
    {
        $this->withMailEnabled();
        Mail::fake();

        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com'])
            ->assertStatus(200);

        $subscriber = NewsletterSubscriber::where('email', 'reader@example.com')->firstOrFail();

        $this->assertNull($subscriber->confirmed_at);
        $this->assertNotNull($subscriber->confirmation_token);

        // Exactly one email: the confirmation request. Nothing is ever sent to
        // a pending address, which is the whole point of double opt-in.
        //
        // assertQueued, not assertSent: the controller queues so a slow mail
        // provider cannot stall the request, and this Laravel version tracks
        // queued mailables separately from sent ones.
        Mail::assertQueued(NewsletterMail::class, 1);
        Mail::assertQueued(NewsletterMail::class, function (NewsletterMail $mail) {
            return $mail->kind === NewsletterMail::KIND_CONFIRMATION
                && $mail->hasTo('reader@example.com')
                && str_contains($mail->actionUrl, '/newsletter/confirm/');
        });
    }

    public function test_the_email_is_lower_cased_so_duplicates_cannot_be_created(): void
    {
        $this->withMailEnabled();

        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'Reader@Example.COM'])
            ->assertStatus(200);

        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com'])
            ->assertStatus(200);

        // Without normalisation the unique index would hold two rows for one
        // person, because MySQL's collation treats them as distinct here.
        $this->assertSame(1, NewsletterSubscriber::where('email', 'reader@example.com')->count());
    }

    public function test_resubmitting_a_pending_address_issues_a_fresh_token(): void
    {
        $this->withMailEnabled();

        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com']);
        $first = NewsletterSubscriber::where('email', 'reader@example.com')->firstOrFail()->confirmation_token;

        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com'])
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        $second = NewsletterSubscriber::where('email', 'reader@example.com')->firstOrFail()->confirmation_token;

        $this->assertNotSame($first, $second, 'A resend must invalidate the previous link.');
    }

    public function test_a_confirmed_address_is_not_overwritten(): void
    {
        $this->withMailEnabled();

        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com']);
        $subscriber = NewsletterSubscriber::where('email', 'reader@example.com')->firstOrFail();
        $subscriber->confirm();

        Mail::fake();
        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com'])
            ->assertStatus(200);

        // Re-subscribing someone who already opted in would silently discard
        // their choice, so the record must be left exactly as it was.
        $subscriber->refresh();
        $this->assertSame(NewsletterSubscriber::STATUS_CONFIRMED, $subscriber->status);
        $this->assertNotNull($subscriber->confirmed_at);
        Mail::assertNothingQueued();
    }

    /**
     * The anti-enumeration guarantee, stated as a test rather than a comment.
     *
     * Anyone can POST an address they do not own. If a new address answered
     * differently from a subscribed one, this endpoint would double as a
     * membership oracle for every address on the list.
     */
    public function test_the_response_cannot_reveal_whether_an_address_is_subscribed(): void
    {
        $this->withMailEnabled();

        $new = $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'stranger@example.com']);

        $existing = NewsletterSubscriber::where('email', 'reader@example.com')->firstOrNew(
            ['email' => 'reader@example.com']
        );
        $existing->save();
        $existing->confirm();

        $confirmed = $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com']);

        $this->assertSame(
            $new->status(),
            $confirmed->status(),
            'Status code must not distinguish a new address from a confirmed one.'
        );
        $this->assertSame(
            $new->json(),
            $confirmed->json(),
            'The body must not distinguish a new address from a confirmed one.'
        );
    }

    public function test_a_subscriber_can_confirm_with_the_emailed_link(): void
    {
        $this->withMailEnabled();
        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com']);
        $subscriber = NewsletterSubscriber::where('email', 'reader@example.com')->firstOrFail();

        $url = URL::temporarySignedRoute(
            'newsletter.confirm',
            now()->addDays(7),
            ['token' => $subscriber->confirmation_token],
        );

        $this->getJson($url)
            ->assertStatus(200)
            ->assertJsonPath('data.status', NewsletterSubscriber::STATUS_CONFIRMED);

        $subscriber->refresh();
        $this->assertNotNull($subscriber->confirmed_at);
        $this->assertNull(
            $subscriber->confirmation_token,
            'A spent confirmation token must not stay valid for replay.'
        );
    }

    public function test_a_tampered_confirmation_link_is_rejected(): void
    {
        $this->withMailEnabled();
        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com']);
        $subscriber = NewsletterSubscriber::where('email', 'reader@example.com')->firstOrFail();

        // The signature no longer matches once the token is swapped, so the
        // `signed` middleware must reject the request before the controller
        // ever looks the subscriber up.
        $this->getJson('/api/v1/newsletter/confirm/'.str_repeat('z', 64))
            ->assertStatus(403);

        $subscriber->refresh();
        $this->assertSame(NewsletterSubscriber::STATUS_PENDING, $subscriber->status);
        $this->assertNull($subscriber->confirmed_at);
    }

    public function test_an_unknown_token_cannot_confirm_anybody(): void
    {
        $this->withMailEnabled();

        $url = URL::temporarySignedRoute(
            'newsletter.confirm',
            now()->addDays(7),
            ['token' => str_repeat('a', 64)],
        );

        $this->getJson($url)->assertStatus(422);
        $this->assertSame(0, NewsletterSubscriber::count());
    }

    public function test_a_subscriber_can_unsubscribe(): void
    {
        $this->withMailEnabled();
        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com']);
        $subscriber = NewsletterSubscriber::where('email', 'reader@example.com')->firstOrFail();
        $subscriber->confirm();

        $url = URL::temporarySignedRoute(
            'newsletter.unsubscribe',
            now()->addDays(30),
            ['token' => $subscriber->unsubscribe_token],
        );

        $this->getJson($url)->assertStatus(200)->assertJsonPath('success', true);

        $subscriber->refresh();
        $this->assertSame(NewsletterSubscriber::STATUS_UNSUBSCRIBED, $subscriber->status);
        $this->assertNotNull($subscriber->unsubscribed_at);
    }

    public function test_unsubscribing_twice_is_harmless(): void
    {
        $this->withMailEnabled();
        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com']);
        $subscriber = NewsletterSubscriber::where('email', 'reader@example.com')->firstOrFail();
        $subscriber->confirm();
        $subscriber->unsubscribe();

        $url = URL::temporarySignedRoute(
            'newsletter.unsubscribe',
            now()->addDays(30),
            ['token' => $subscriber->unsubscribe_token],
        );

        // Mail clients retry one-click unsubscribes, so a repeat must not 500.
        $this->getJson($url)->assertStatus(200);
    }

    public function test_a_previously_unsubscribed_address_can_resubscribe(): void
    {
        $this->withMailEnabled();
        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com']);
        $subscriber = NewsletterSubscriber::where('email', 'reader@example.com')->firstOrFail();
        $subscriber->confirm();
        $subscriber->unsubscribe();

        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com'])
            ->assertStatus(200);

        $subscriber->refresh();
        $this->assertSame(NewsletterSubscriber::STATUS_PENDING, $subscriber->status);
        $this->assertNotNull($subscriber->confirmation_token);
        $this->assertNull($subscriber->unsubscribed_at);
    }

    public function test_the_email_is_required_and_must_be_valid(): void
    {
        $this->withMailEnabled();

        $this->postJson('/api/v1/newsletter/subscribe', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->assertSame(0, NewsletterSubscriber::count());
    }

    public function test_the_confirmation_link_is_logged_when_mail_is_disabled(): void
    {
        // This is the local-development path: with no mail provider configured
        // the user still has to be able to complete the flow.
        $this->withMailEnabled(false);
        Log::spy();

        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com'])
            ->assertStatus(200);

        Log::shouldHaveReceived('info')
            ->withArgs(fn ($message, $context) => $context['email'] === 'reader@example.com'
                && str_contains($context['url'], '/newsletter/confirm/'));
    }

    public function test_a_mail_provider_failure_does_not_lose_the_signup(): void
    {
        $this->withMailEnabled();
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('provider down'));

        $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'reader@example.com'])
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        // The row is still stored, so the visitor can request another link.
        $this->assertDatabaseHas('newsletter_subscribers', ['email' => 'reader@example.com']);
    }
}
