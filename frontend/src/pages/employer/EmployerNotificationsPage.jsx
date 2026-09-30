import NotificationsPanel from '../../components/common/NotificationsPanel'
import { employerApi } from '../../services/api'

export default function EmployerNotificationsPage() {
  return (
    <NotificationsPanel
      api={employerApi}
      eyebrow="EMPLOYER"
      subtitle="Track applicant activity, interviews, and account updates."
    />
  )
}
