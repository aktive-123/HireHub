import NotificationsPanel from '../../components/common/NotificationsPanel'
import { seekerApi } from '../../services/api'

export default function SeekerNotificationsPage() {
  return (
    <NotificationsPanel
      api={seekerApi}
      eyebrow="JOB SEEKER"
      subtitle="Track application progress, interviews, and account updates."
    />
  )
}
