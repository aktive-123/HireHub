import AdminPageHeader from '../../components/admin/AdminPageHeader'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Reveal from '../../components/ui/Reveal'
import { adminCategories, CATEGORY_STATUS_LABELS } from '../../data/admin'

const TONES = ['primary', 'info', 'success', 'warning']

export default function AdminCategoriesPage() {
  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Categories"
          subtitle="Curate the job categories shown across the listing pages."
          action={
            <Button variant="primary" icon="bi-plus-lg">
              Add category
            </Button>
          }
        />

        <div className="row g-4">
          {adminCategories.map((category, index) => (
            <div className="col-12 col-sm-6 col-lg-3" key={category.id}>
              <Reveal delay={index * 50}>
                <Card className="hh-card-body hh-card-hover h-100 d-flex flex-column">
                  <div className={`hh-stat-icon hh-stat-icon-${TONES[index % TONES.length]} hh-mb-2`}>
                    <i className={`bi bi-${category.icon}`} aria-hidden="true" />
                  </div>
                  <h3 className="hh-fw-semibold text-secondary hh-mb-0">{category.name}</h3>
                  <span className="text-muted small hh-mb-3">{category.jobs} open roles</span>
                  <div className="mt-auto d-flex align-items-center justify-content-between gap-2">
                    <Badge variant={category.status === 'active' ? 'success' : 'secondary'} sm>
                      {CATEGORY_STATUS_LABELS[category.status]}
                    </Badge>
                    <div className="d-flex gap-2">
                      <button type="button" className="hh-icon-btn" data-tooltip="Edit category" aria-label={`Edit ${category.name}`}>
                        <i className="bi bi-pencil" aria-hidden="true" />
                      </button>
                      <button type="button" className="hh-icon-btn hh-icon-btn-danger hh-tip-start" data-tooltip="Delete category" aria-label={`Delete ${category.name}`}>
                        <i className="bi bi-trash" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </Card>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}