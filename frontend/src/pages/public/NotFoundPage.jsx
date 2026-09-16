import { Button } from '@/components/ui'
import { EmptyState } from '@/components/ui'

export default function NotFoundPage() {
  return (
    <section className="page-container">
      <EmptyState
        icon="compass"
        title="Page not found"
        text="The page you are looking for doesn't exist or has been moved. Check the address or head back home."
        action={<Button to="/" variant="primary">Back to Home</Button>}
      />
    </section>
  )
}