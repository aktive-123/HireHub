import Modal from './Modal'
import Button from './Button'

// Blocking confirmation used before destructive admin actions. Kept generic so
// every delete/suspend control in the console shares one look, one keyboard
// (Esc) behaviour and one busy state instead of each page inventing a native
// confirm() call that cannot show a spinner or a server error.
export default function ConfirmDialog({
  isOpen = false,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  busy = false,
  error = null,
}) {
  // Matches the existing deactivation controls: an outline button recoloured
  // via .hh-btn-danger-outline, so the destructive action still reads as a
  // button and not a filled call to action.
  const isDanger = variant === 'danger'

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? 'outline-primary' : 'primary'}
            className={isDanger ? 'hh-btn-danger-outline' : ''}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      {message ? <p className="mb-0 text-secondary">{message}</p> : null}
      {error ? (
        <div className="alert alert-danger mt-3 mb-0" role="alert">
          {error}
        </div>
      ) : null}
    </Modal>
  )
}
