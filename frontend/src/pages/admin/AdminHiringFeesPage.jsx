import { useState } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminStatGrid from '../../components/admin/AdminStatGrid'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import StatusBadge from '../../components/ui/StatusBadge'
import DataTable from '../../components/ui/DataTable'
import TablePagination from '../../components/ui/TablePagination'
import EmptyState from '../../components/ui/EmptyState'
import Alert from '../../components/ui/Alert'
import LoadingState from '../../components/ui/LoadingState'
import ReceiptActions from '../../components/common/ReceiptActions'
import { adminApi, adminReceiptsApi } from '../../services/api'
import { useAdminList, useAdminData } from '../../hooks/useAdminData'

const PAGE_SIZE = 10

// The statuses a fee can hold, mirroring PaymentStatus. Tabs filter server-side
// so the counts and the rows always describe the same set.
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'succeeded', label: 'Collected' },
  { key: 'pending', label: 'Awaiting payment' },
  { key: 'failed', label: 'Failed' },
]

/**
 * Placement-fee revenue.
 *
 * Every figure on this page is read live from `hiring_fees`; none of it is
 * cached or recomputed in the browser. `collected` deliberately counts only
 * settled fees — a pending checkout is not money.
 */
export default function AdminHiringFeesPage() {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const summary = useAdminData(() => adminApi.hiringFeeSummary({ days: 30 }), null, [])

  const {
    items: fees,
    meta,
    loading,
    error,
  } = useAdminList(
    () =>
      adminApi.hiringFees({
        page,
        per_page: PAGE_SIZE,
        ...(tab === 'all' ? {} : { status: tab }),
        ...(search.trim() ? { search: search.trim() } : {}),
      }),
    [],
    [tab, page, search]
  )

  const total = meta?.total ?? fees.length

  const stats = summary
    ? [
        {
          key: 'collected',
          label: 'Collected (30 days)',
          value: summary.collected_formatted,
          icon: 'bi-cash-stack',
          tone: 'success',
        },
        {
          key: 'pending',
          label: 'Awaiting payment',
          value: summary.pending_formatted,
          icon: 'bi-hourglass-split',
          tone: 'warning',
        },
        {
          key: 'fees',
          label: 'Fees raised',
          value: summary.total_fees,
          icon: 'bi-receipt',
          tone: 'primary',
        },
        {
          key: 'average',
          label: 'Average fee',
          value: (summary.average_fee / 100).toLocaleString(undefined, {
            style: 'currency',
            currency: summary.currency || 'NGN',
          }),
          icon: 'bi-graph-up',
          tone: 'info',
        },
      ]
    : []

  return (
    <section className="hh-section-space bg-white">
      <div className="page-container">
        <AdminPageHeader
          eyebrow="ADMIN CONSOLE"
          title="Hiring Fees"
          subtitle="Placement fees collected from employers when they confirm a hire."
        />

        {summary && <AdminStatGrid stats={stats} cols={4} />}

        {summary && summary.hires_missing_fee > 0 && (
          <Alert variant="warning" className="hh-mb-4">
            <strong>{summary.hires_missing_fee}</strong> candidate
            {summary.hires_missing_fee === 1 ? ' is' : 's are'} marked hired without a settled fee. Every hire
            should have one — this usually means the row was written outside the payment flow.
          </Alert>
        )}

        {!summary && <LoadingState text="Loading hiring fee revenue…" />}

        <div className="hh-tabs hh-tabs--pills hh-mb-3" role="tablist" aria-label="Hiring fee status">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`hh-tab ${tab === key ? 'is-active' : ''}`}
              onClick={() => {
                setTab(key)
                setPage(1)
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hh-search-field-lg hh-mb-4">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            className="hh-form-control"
            placeholder="Search by reference, employer or job"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            aria-label="Search hiring fees"
          />
        </div>

        {error && (
          <Alert variant="danger" className="hh-mb-4">
            {error?.message || 'Could not load the hiring fee ledger.'}
          </Alert>
        )}

        <Card className="hh-card-body hh-p-0 hh-card--table">
          {loading ? (
            <div className="hh-p-5">
              <LoadingState text="Loading fees…" />
            </div>
          ) : fees.length > 0 ? (
            <DataTable
              zebra
              columns={[
                { key: 'reference', label: 'Reference' },
                { key: 'employer', label: 'Employer' },
                { key: 'job', label: 'Job' },
                { key: 'level', label: 'Level' },
                { key: 'amount', label: 'Amount', align: 'right' },
                { key: 'status', label: 'Status', align: 'center' },
                { key: 'paid_at', label: 'Paid', align: 'right' },
                { key: 'receipt', label: 'Receipt', align: 'right' },
              ]}
              rows={fees.map((fee) => ({
                id: fee.id,
                reference: <code className="small">{fee.reference}</code>,
                employer: (
                  <div>
                    <div className="hh-fw-medium">{fee.employer}</div>
                    <div className="small text-secondary">{fee.company}</div>
                  </div>
                ),
                job: (
                  <div>
                    <div>{fee.job}</div>
                    <div className="small text-secondary">{fee.candidate}</div>
                  </div>
                ),
                level: fee.level_label,
                amount: fee.amount_major.toLocaleString(undefined, {
                  style: 'currency',
                  currency: fee.currency || 'NGN',
                }),
                status: <StatusBadge status={fee.status} />,
                paid_at: fee.paid_at_label || '—',
                // Receipts are stored against the payment, so the admin table
                // reads the fee's payment reference rather than the fee's own.
                receipt: (
                  <ReceiptActions
                    reference={fee.payment_reference}
                    paid={fee.status === 'succeeded' && Boolean(fee.payment_reference)}
                    onView={adminReceiptsApi.openReceipt}
                    onDownload={adminReceiptsApi.downloadReceipt}
                  />
                ),
              }))}
              rowKey={(row) => row.id}
            />
          ) : (
            <div className="hh-p-5">
              <EmptyState
                icon="receipt"
                title="No hiring fees yet"
                text="Placement fees appear here once an employer confirms a hire."
              />
            </div>
          )}
        </Card>

        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />

        <Card className="hh-card-body hh-mt-5">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div>
              <h3 className="hh-card-title-md hh-mb-1">Fee rates</h3>
              <p className="text-muted small mb-0">
                The flat and percentage rates used to price each level are edited under Platform Settings.
              </p>
            </div>
            <Button to="/admin/settings" variant="outline" icon="bi-sliders">
              Edit rates
            </Button>
          </div>
        </Card>
      </div>
    </section>
  )
}
