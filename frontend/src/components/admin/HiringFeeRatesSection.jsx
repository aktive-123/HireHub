import { useEffect, useState } from 'react'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import Button from '../ui/Button'
import FormInput from '../ui/FormInput'
import { adminApi } from '../../services/api'

// Money is stored as an integer in the currency's minor unit (kobo), which is
// the only representation that cannot accrue floating-point drift. The form
// shows major units because that is what an admin thinks in, and converts on
// the way in and out — the conversion lives in exactly these two helpers.
const toMajor = (minor) => (Number(minor ?? 0) / 100).toString()
const toMinor = (major) => Math.round(Number(major ?? 0) * 100)

// Percentages are stored as basis points for the same reason: 5% is 500, not
// 0.05, so a rate can never be stored as an approximation of itself.
const toPercent = (bps) => (bps === null || bps === undefined ? '' : (bps / 100).toString())
const toBps = (percent) =>
  percent === '' || percent === null || percent === undefined ? null : Math.round(Number(percent) * 100)

/**
 * The placement-fee tiers an admin can edit.
 *
 * Kept as its own section with its own save button because it writes to
 * `/admin/hiring-fee-rates`, not `/admin/settings`. Folding it into the single
 * global "Save settings" call would make one button issue two unrelated writes,
 * and a failure in the rate half would look like a failure of the whole form.
 */
export default function HiringFeeRatesSection({ onChange }) {
  const [rates, setRates] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    adminApi
      .hiringFeeRates()
      .then((data) => {
        if (cancelled) return
        setRates(data)
        setDrafts(
          Object.fromEntries(
            (data ?? []).map((rate) => [
              rate.id,
              {
                flat: toMajor(rate.flat_amount),
                percent: toPercent(rate.percentage_override),
                useGreaterOf: rate.use_greater_of,
                isActive: rate.is_active,
              },
            ])
          )
        )
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load the hiring fee rates.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setDraft = (id, key, value) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      // Sequenced rather than parallel: a partial failure is easier to reason
      // about when the requests do not race, and there are only four of them.
      for (const rate of rates) {
        const draft = drafts[rate.id]
        await adminApi.updateHiringFeeRate(rate.id, {
          flat_amount: toMinor(draft.flat),
          percentage_override: toBps(draft.percent),
          use_greater_of: draft.useGreaterOf,
          is_active: draft.isActive,
        })
      }
      const refreshed = await adminApi.hiringFeeRates()
      setRates(refreshed)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
      onChange?.()
    } catch (err) {
      setError(err?.message || 'Could not save the hiring fee rates.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="hh-card-body hh-mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 hh-mb-2">
        <div>
          <h3 className="hh-card-title-md hh-mb-1">Hiring fee rates</h3>
          <p className="text-muted small mb-0">
            The one-off placement fee charged to employers when they confirm a hire. Job seekers are never
            charged.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {saved && (
            <Badge variant="success" icon="check2">
              Saved
            </Badge>
          )}
          <Button
            variant="primary"
            size="sm"
            icon="bi-check2"
            onClick={handleSave}
            disabled={saving || !rates}
          >
            {saving ? 'Saving…' : 'Save rates'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      )}

      {!rates && !error && <p className="text-muted small mb-0">Loading rates…</p>}

      {rates?.map((rate) => {
        const draft = drafts[rate.id] ?? {}
        return (
          <div key={rate.id} className="hh-setting-row">
            <div className="flex-grow-1">
              <div className="hh-setting-title d-flex align-items-center gap-2">
                {rate.level_label}
                {rate.scope === 'category' && <Badge variant="secondary">{rate.category}</Badge>}
                {!draft.isActive && <Badge variant="warning">Inactive</Badge>}
              </div>
              <p className="hh-setting-desc mb-2">
                {rate.fees_charged > 0
                  ? `Has priced ${rate.fees_charged} hire${rate.fees_charged === 1 ? '' : 's'}.`
                  : 'Has not priced any hires yet.'}
              </p>

              <div className="row g-2 align-items-end">
                <div className="col-12 col-sm-6 col-md-4">
                  <FormInput
                    label="Flat amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.flat ?? ''}
                    className="mb-0"
                    onChange={(e) => setDraft(rate.id, 'flat', e.target.value)}
                    helperText={`${rate.currency}, charged per hire`}
                  />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <FormInput
                    label="Percentage of annual salary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.percent ?? ''}
                    className="mb-0"
                    onChange={(e) => setDraft(rate.id, 'percent', e.target.value)}
                    helperText="Leave blank for a flat-only fee"
                  />
                </div>
                <div className="col-12 col-md-4">
                  <div className="d-flex flex-wrap gap-3 pb-1">
                    <label className="d-flex align-items-center gap-2 small mb-0">
                      <input
                        type="checkbox"
                        checked={Boolean(draft.useGreaterOf)}
                        onChange={(e) => setDraft(rate.id, 'useGreaterOf', e.target.checked)}
                      />
                      Charge the higher of the two
                    </label>
                    <label className="d-flex align-items-center gap-2 small mb-0">
                      <input
                        type="checkbox"
                        checked={Boolean(draft.isActive)}
                        onChange={(e) => setDraft(rate.id, 'isActive', e.target.checked)}
                      />
                      Active
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <p className="small text-muted mb-0">
        Changing a rate never rewrites a fee that was already quoted — each hire keeps the amount it was
        charged.
      </p>
    </Card>
  )
}
