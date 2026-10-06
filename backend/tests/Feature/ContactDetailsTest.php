<?php

namespace Tests\Feature;

use App\Http\Resources\V1\SeekerResource;
use App\Models\Company;
use App\Models\User;
use App\Support\Address;
use App\Support\Phone;
use Tests\ApiTestCase;

/**
 * Phone and address capture at sign-up, and the derived `location` string the
 * rest of the site reads.
 *
 * The behaviour that matters here is that a phone number typed four different
 * ways is stored one way, and that a city and a state are stored as two values
 * rather than as one string somebody has to remember to spell consistently.
 */
class ContactDetailsTest extends ApiTestCase
{
    /**
     * @return array<string, mixed>
     */
    private function seekerPayload(array $overrides = []): array
    {
        return [
            'first_name' => 'Ada',
            'last_name' => 'Obi',
            'email' => 'ada@example.com',
            'phone' => '08012345678',
            'city' => 'Lagos',
            'state' => 'Lagos',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            ...$overrides,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function employerPayload(array $overrides = []): array
    {
        return [
            'role' => 'employer',
            'full_name' => 'David Okafor',
            'company_name' => 'Acme Tech',
            'work_email' => 'david@acme.com',
            'phone' => '08012345678',
            'address_line' => '12 Admiralty Way, Lekki Phase 1',
            'city' => 'Lagos',
            'state' => 'Lagos',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            ...$overrides,
        ];
    }

    /**
     * Every spelling of one handset has to collapse onto one stored value, or a
     * lookup on the formatted form misses the row saved from the plain one.
     *
     * @dataProvider spellings
     */
    public function test_a_phone_is_stored_in_one_canonical_form(string $typed, string $expected): void
    {
        $this->postJson('/api/v1/auth/register', $this->seekerPayload([
            'phone' => $typed,
        ]))->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'ada@example.com',
            'phone' => $expected,
        ]);
    }

    /**
     * @return array<string, array{0: string, 1: string}>
     */
    public static function spellings(): array
    {
        return [
            'plain local' => ['08012345678', '+2348012345678'],
            'spaced' => ['0801 234 5678', '+2348012345678'],
            'hyphenated' => ['0801-234-5678', '+2348012345678'],
            'bracketed' => ['(0801) 234 5678', '+2348012345678'],
            'already international' => ['+2348012345678', '+2348012345678'],
            'international spaced' => ['+234 801 234 5678', '+2348012345678'],
            'country code without plus' => ['2348012345678', '+2348012345678'],
            'international access code' => ['002348012345678', '+2348012345678'],
            'bare national digits' => ['8012345678', '+2348012345678'],
        ];
    }

    /**
     * @dataProvider rejections
     */
    public function test_a_value_that_cannot_be_a_nigerian_mobile_is_refused(string $phone): void
    {
        $this->postJson('/api/v1/auth/register', $this->seekerPayload(['phone' => $phone]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('phone');

        $this->assertDatabaseMissing('users', ['email' => 'ada@example.com']);
    }

    /**
     * A landline, a short number and a pasted sentence all have to fail. The
     * landline is the interesting one: 0123 456 789 has the right digit count
     * and would pass a naive length check.
     *
     * @return array<string, array{0: string}>
     */
    public static function rejections(): array
    {
        return [
            'landline' => ['0123456789'],
            'too short' => ['0801234'],
            'letters' => ['0801ABCDEFG'],
            'empty' => [''],
            'pasted prose' => ['call me on 08012345678 after work'],
        ];
    }

    /**
     * Two accounts sharing one number is a legitimate outcome — a family on one
     * handset, a shared switchboard, a recruiter placing several candidates.
     *
     * A uniqueness violation here would also answer "does this number already
     * have an account?", which is the enumeration oracle the rest of this
     * codebase works to avoid, so the column is indexed but not unique.
     */
    public function test_two_accounts_may_share_a_phone_number(): void
    {
        $this->postJson('/api/v1/auth/register', $this->seekerPayload([
            'phone' => '08012345678',
        ]))->assertCreated();

        $this->postJson('/api/v1/auth/register', $this->seekerPayload([
            'email' => 'second@example.com',
            // Same number, typed differently, so this also proves the shared
            // value is matched after normalisation rather than on the raw string.
            'phone' => '+234 801 234 5678',
        ]))->assertCreated();

        $this->assertSame(2, User::where('phone', '+2348012345678')->count());
    }

    /**
     * @dataProvider requiredContactFields
     */
    public function test_registration_refuses_to_create_an_account_without_these(string $field): void
    {
        $payload = $this->seekerPayload();
        unset($payload[$field]);

        $this->postJson('/api/v1/auth/register', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors($field);

        $this->assertDatabaseMissing('users', ['email' => 'ada@example.com']);
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function requiredContactFields(): array
    {
        return [
            'phone' => ['phone'],
            'city' => ['city'],
            'state' => ['state'],
        ];
    }

    /**
     * A state is a closed set. Free text here would let a typo invent a new
     * place that no employer ever filters on.
     */
    public function test_a_state_outside_the_configured_list_is_refused(): void
    {
        $this->postJson('/api/v1/auth/register', $this->seekerPayload(['state' => 'Lagos State']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('state');
    }

    public function test_a_company_requires_a_street_address_but_a_seeker_does_not(): void
    {
        $payload = $this->employerPayload();
        unset($payload['address_line']);

        $this->postJson('/api/v1/auth/register', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('address_line');

        $this->postJson('/api/v1/auth/register', $this->seekerPayload())
            ->assertCreated();
    }

    public function test_a_street_address_too_short_to_be_one_is_refused(): void
    {
        $this->postJson('/api/v1/auth/register', $this->employerPayload(['address_line' => 'x']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('address_line');
    }

    /**
     * `location` is what every display site and the companies-directory filter
     * read, so it is derived rather than typed. Deriving it is what stops "Lagos"
     * and "Lagos, Lagos" becoming two different places in the same filter.
     */
    public function test_location_is_derived_from_the_city_and_state(): void
    {
        $this->postJson('/api/v1/auth/register', $this->seekerPayload([
            'address_line' => '5 Somewhere Road',
            'city' => 'Ikeja',
            'state' => 'Lagos',
        ]))->assertCreated();

        $user = User::where('email', 'ada@example.com')->firstOrFail();

        $this->assertDatabaseHas('profiles', [
            'user_id' => $user->id,
            'address_line' => '5 Somewhere Road',
            'city' => 'Ikeja',
            'state' => 'Lagos',
            'location' => 'Ikeja, Lagos',
        ]);
    }

    public function test_editing_the_profile_re_derives_the_location(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->patchJson('/api/v1/seeker/profile', [
            'city' => 'Abuja',
            'state' => 'Federal Capital Territory',
        ])->assertOk();

        $this->assertDatabaseHas('profiles', [
            'user_id' => $seeker->id,
            'city' => 'Abuja',
            'state' => 'Federal Capital Territory',
            'location' => 'Abuja, Federal Capital Territory',
        ]);
    }

    public function test_editing_the_company_re_derives_the_location(): void
    {
        $employer = $this->employer();

        $this->asApiUser($employer)->putJson('/api/v1/employer/company', [
            'city' => 'Port Harcourt',
            'state' => 'Rivers',
        ])->assertOk();

        $this->assertDatabaseHas('companies', [
            'id' => $this->companyOf($employer)->id,
            'city' => 'Port Harcourt',
            'state' => 'Rivers',
            'location' => 'Port Harcourt, Rivers',
        ]);
    }

    /**
     * A request that never mentions a city or a state must not blank the
     * location, or a partial edit — changing only a tagline — would silently
     * remove a company from every location filter.
     */
    public function test_a_partial_edit_cannot_blank_a_derived_location(): void
    {
        $employer = $this->employer(['city' => 'Lagos', 'state' => 'Lagos', 'location' => 'Lagos, Lagos']);
        $company = $this->companyOf($employer);

        $this->asApiUser($employer)->putJson('/api/v1/employer/company', [
            'tagline' => 'We build things',
        ])->assertOk();

        $this->assertSame('Lagos, Lagos', $company->fresh()->location);
    }

    /**
     * The old free-text field is still accepted, so a client that has not been
     * updated keeps working instead of having its location discarded.
     */
    public function test_the_legacy_free_text_location_is_still_accepted(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->patchJson('/api/v1/seeker/profile', [
            'location' => 'Somewhere remote',
        ])->assertOk();

        $this->assertDatabaseHas('profiles', [
            'user_id' => $seeker->id,
            'location' => 'Somewhere remote',
        ]);
    }

    public function test_the_settings_screen_normalises_a_phone_the_same_way(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->patchJson('/api/v1/settings', [
            'phone' => '0809 876 5432',
        ])->assertOk();

        $this->assertSame('+2348098765432', $seeker->fresh()->phone);
    }

    public function test_the_settings_screen_still_refuses_a_bad_phone(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->patchJson('/api/v1/settings', [
            'phone' => '0123456789',
        ])->assertStatus(422)->assertJsonValidationErrors('phone');
    }

    /**
     * A company address is published, because knowing where a company is based
     * is ordinary context for an applicant.
     */
    public function test_the_public_company_profile_carries_the_address(): void
    {
        $this->employer([
            'slug' => 'acme-tech',
            'address_line' => '12 Admiralty Way, Lekki Phase 1',
            'city' => 'Lagos',
            'state' => 'Lagos',
            'location' => 'Lagos, Lagos',
        ]);

        $this->getJson('/api/v1/companies/acme-tech')
            ->assertOk()
            ->assertJsonPath('data.address_line', '12 Admiralty Way, Lekki Phase 1')
            ->assertJsonPath('data.city', 'Lagos')
            ->assertJsonPath('data.state', 'Lagos');
    }

    /**
     * A seeker's street address is a home address. Their own editor reads it
     * back, but the resource that other people see a seeker through must not
     * carry it, now that the column exists.
     */
    public function test_a_seeker_street_address_is_not_published_on_their_public_resource(): void
    {
        $seeker = $this->seeker();

        $this->asApiUser($seeker)->patchJson('/api/v1/seeker/profile', [
            'address_line' => '9 Private Close',
            'city' => 'Lagos',
            'state' => 'Lagos',
        ])->assertOk();

        $this->assertDatabaseHas('profiles', [
            'user_id' => $seeker->id,
            'address_line' => '9 Private Close',
            'location' => 'Lagos, Lagos',
        ]);

        $this->getJson('/api/v1/seeker/profile')
            ->assertOk()
            ->assertJsonPath('data.address_line', '9 Private Close');

        $public = (new SeekerResource($seeker->fresh()->load('profile')))->toArray(request());

        $this->assertArrayNotHasKey('address_line', $public);
        $this->assertSame('Lagos, Lagos', $public['location']);
    }

    public function test_a_half_filled_address_still_renders_something(): void
    {
        $this->assertSame('Yaba', Address::location('Yaba', null));
        $this->assertSame('Ogun', Address::location(null, 'Ogun'));
        $this->assertNull(Address::location(null, null));
        $this->assertSame('Ikeja, Lagos', Address::location(' Ikeja ', ' Lagos '));
    }

    public function test_an_already_canonical_phone_normalises_to_itself(): void
    {
        $this->assertSame('+2348012345678', Phone::normalize('+2348012345678'));
        $this->assertNull(Phone::normalize(null));
        $this->assertNull(Phone::normalize('0123456789'));
        $this->assertSame('+234 801 234 5678', Phone::display('08012345678'));
    }

    public function test_a_company_with_no_address_yet_still_serialises(): void
    {
        $employer = $this->employer();
        $company = $this->companyOf($employer);

        $this->assertInstanceOf(Company::class, $company);
        $this->asApiUser($employer)
            ->getJson('/api/v1/employer/company')
            ->assertOk()
            ->assertJsonStructure(['data' => ['city', 'state', 'address_line', 'location']]);
    }
}
