<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\ApiTestCase;

class ProfilePictureTest extends ApiTestCase
{
    private const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=';

    private static function pngBytes(): string
    {
        $bytes = base64_decode(self::PNG_BASE64, true);

        if (! is_string($bytes)) {
            throw new RuntimeException('The PNG test fixture is invalid.');
        }

        return $bytes;
    }

    public function test_each_account_role_can_upload_and_remove_its_own_photo(): void
    {
        Storage::fake('public');

        foreach ([UserRole::Admin, UserRole::Seeker, UserRole::Employer] as $role) {
            $user = User::factory()->create(['role' => $role->value]);

            $uploaded = $this->asApiUser($user)
                ->post('/api/v1/settings/profile-picture', [
                    'profile_photo' => UploadedFile::fake()->createWithContent(
                        'profile.png',
                        self::pngBytes()
                    ),
                ])
                ->assertOk()
                ->assertJsonPath('success', true);

            $path = $user->fresh()->profile_picture;
            $this->assertNotEmpty($path);
            Storage::disk('public')->assertExists($path);
            $this->assertStringContainsString('/storage/'.$path, $uploaded->json('data.avatar_url'));

            $this->asApiUser($user)
                ->deleteJson('/api/v1/settings/profile-picture')
                ->assertOk()
                ->assertJsonPath('data.avatar_url', null);

            $this->assertNull($user->fresh()->profile_picture);
            Storage::disk('public')->assertMissing($path);
        }
    }

    public function test_profile_picture_upload_rejects_non_images_and_files_over_two_megabytes(): void
    {
        Storage::fake('public');
        $user = $this->seeker();

        $this->asApiUser($user)
            ->post('/api/v1/settings/profile-picture', [
                'profile_photo' => UploadedFile::fake()->createWithContent('not-an-image.png', 'plain text'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('profile_photo');

        $this->asApiUser($user)
            ->post('/api/v1/settings/profile-picture', [
                'profile_photo' => UploadedFile::fake()->createWithContent(
                    'large.png',
                    self::pngBytes().str_repeat('x', 2 * 1024 * 1024)
                ),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('profile_photo');

        $this->assertNull($user->fresh()->profile_picture);
        Storage::disk('public')->assertDirectoryEmpty("profile-pictures/{$user->id}");
    }
}
