import { Component, type ReactNode } from 'react'
import { reportError } from '@/lib/monitoring'
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error) {
    reportError(error)
  }
  render() {
    if (this.state.failed)
      return (
        <main className="min-h-screen grid place-items-center p-6">
          <section className="panel p-8 max-w-md">
            <h1 className="text-xl font-semibold mb-3">Something interrupted this page</h1>
            <p className="text-sm text-mut mb-5">
              Your saved records are still in your workspace. Reload to try again.
            </p>
            <button className="btn-primary" onClick={() => location.reload()}>
              Reload application
            </button>
          </section>
        </main>
      )
    return this.props.children
  }
}
