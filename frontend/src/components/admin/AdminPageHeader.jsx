import PageHeader from '../ui/PageHeader'

// Admin pages use the gradient hero variant of the shared PageHeader.
export default function AdminPageHeader({ eyebrow = 'ADMIN CONSOLE', title, subtitle, action }) {
  return (
    <PageHeader
      variant="admin"
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      action={action}
    />
  )
}