import { useRef, useState } from 'react'
import Card from '../ui/Card'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../services/api'
import UserAvatar from './UserAvatar'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

async function cropToSquareJpeg(file) {
  const image = await createImageBitmap(file)
  const size = 512
  const cropSize = Math.min(image.width, image.height)
  const sourceX = Math.floor((image.width - cropSize) / 2)
  const sourceY = Math.floor((image.height - cropSize) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  if (!context) {
    image.close()
    throw new Error('Your browser could not prepare this photo. Please try another image.')
  }

  context.fillStyle = '#fff'
  context.fillRect(0, 0, size, size)
  context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, size, size)
  image.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
  if (!blob) throw new Error('Your browser could not prepare this photo. Please try another image.')
  if (blob.size > MAX_FILE_SIZE) throw new Error('The cropped photo must be no larger than 2 MB.')

  return new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' })
}

export default function ProfilePhotoCard({ embedded = false }) {
  const { user, refresh } = useAuth()
  const inputRef = useRef(null)
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleSelect = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError('')
    setNotice('')
    if (!ALLOWED_TYPES.has(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Choose an image no larger than 2 MB.')
      return
    }

    setBusy(true)
    try {
      const cropped = await cropToSquareJpeg(file)
      const result = await authApi.uploadProfilePicture(cropped)
      const nextUrl = result.data?.avatar_url ?? null
      setAvatarUrl(nextUrl)
      setNotice(result.message || 'Profile picture updated.')
      try {
        await refresh()
      } catch {
        setError('Your photo was saved, but the account display could not be refreshed. Reload the page to see it everywhere.')
      }
    } catch (err) {
      setError(err?.message || 'Could not upload your photo. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await authApi.removeProfilePicture()
      setAvatarUrl(result.data?.avatar_url ?? null)
      setNotice(result.message || 'Profile picture removed.')
      try {
        await refresh()
      } catch {
        setError('Your photo was removed, but the account display could not be refreshed. Reload the page to see the change everywhere.')
      }
    } catch (err) {
      setError(err?.message || 'Could not remove your photo. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const content = (
    <>
      <div className="hh-card-title-md hh-mb-3">Profile picture</div>
      <div className="d-flex align-items-center gap-3">
        <UserAvatar
          name={user?.name}
          avatarUrl={avatarUrl}
          className="hh-avatar hh-avatar-lg hh-avatar-soft"
          onClick={() => inputRef.current?.click()}
          label={busy ? 'Saving profile picture' : 'Upload or change profile picture'}
          disabled={busy}
        />
        <div>
          <p className="text-muted mb-2">
            {busy ? 'Saving your photo…' : 'Click your photo to upload or change it. JPG, PNG, or WebP; maximum 2 MB.'}
            {' '}Photos are cropped to a square.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="visually-hidden"
            onChange={handleSelect}
            disabled={busy}
            aria-label="Choose a profile picture"
          />
          {avatarUrl ? (
            <button
              type="button"
              className="hh-btn hh-btn-link"
              onClick={handleRemove}
              disabled={busy}
            >
              Remove photo
            </button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-danger mt-3 mb-0" role="alert">{error}</p> : null}
      {notice ? <p className="text-success mt-3 mb-0" role="status">{notice}</p> : null}
    </>
  )

  return embedded ? content : <Card className="hh-card-body hh-mb-4">{content}</Card>
}
