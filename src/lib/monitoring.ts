import * as Sentry from '@sentry/react'
export function startMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || import.meta.env.DEV) return
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV ?? 'production',
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    defaultIntegrations: false,
    integrations: [],
    tracesSampleRate: 0,
    beforeSend(event) {
      // HR/financial values can occur in error messages, URLs, and breadcrumbs.
      delete event.user
      delete event.request
      delete event.contexts
      delete event.transaction
      delete event.extra
      event.breadcrumbs = []
      if (event.exception?.values)
        for (const exception of event.exception.values) {
          exception.value = 'Application error (details redacted)'
          if (exception.stacktrace?.frames)
            for (const frame of exception.stacktrace.frames) {
              if (frame.filename) frame.filename = frame.filename.split('?')[0]
            }
        }
      if (event.message) event.message = 'Application error (details redacted)'
      return event
    },
  })
}
export function reportError(error: unknown) {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) Sentry.captureException(error)
}
