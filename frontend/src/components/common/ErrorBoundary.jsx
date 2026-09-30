import { Component } from 'react'
import Button from '../ui/Button'

/**
 * Catches render-time crashes so one broken page cannot blank the whole app.
 *
 * Without this, a throw during render unmounts the entire React tree: the user
 * gets a blank white screen with no message, no navigation and no way back
 * except a manual reload. That is strictly worse than the underlying bug,
 * because there is no longer any clue what went wrong.
 *
 * Wrapped around the <Outlet /> of each layout, so the chrome (sidebar,
 * navbar, footer) survives and only the failing page is replaced.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Kept in the console because it is the only place the stack survives; the
    // UI deliberately does not show internals to a signed-in user.
    console.error('HireHub render error:', error, info?.componentStack)
  }

  handleReset() {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) return this.props.fallback(error, this.handleReset)

    return (
      <div className="page-container hh-section-space">
        <div className="hh-card hh-card-body text-center">
          <span className="hh-stat-icon hh-stat-icon-danger" aria-hidden="true">
            <i className="bi bi-exclamation-triangle" />
          </span>
          <h2 className="mt-3 mb-2">This page ran into a problem</h2>
          <p className="hh-text-muted mb-4">
            Something went wrong while rendering this page. The rest of the site still
            works — you can retry, or head back to your dashboard.
          </p>
          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <Button variant="primary" icon="bi-arrow-clockwise" pill onClick={this.handleReset}>
              Try again
            </Button>
            <Button to="/" variant="outline-primary" icon="bi-house" pill>
              Back to HireHub Home
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
