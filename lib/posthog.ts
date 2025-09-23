// Server-side PostHog client - only import posthog-node in server context
export default async function PostHogClient() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !process.env.NEXT_PUBLIC_POSTHOG_HOST) {
    return null
  }
  
  // Dynamic import to avoid bundling posthog-node in client
  if (typeof window === 'undefined') {
    const { PostHog } = await import('posthog-node')
    const posthogClient = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_KEY,
      {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0
      }
    )
    return posthogClient
  }
  
  return null
}

// Analytics event capture class for server-side usage
export class PosthogEventCapture {
  constructor(private env: { NEXT_PUBLIC_POSTHOG_HOST?: string; NEXT_PUBLIC_POSTHOG_KEY?: string }) {}

  async capture(eventName: string, properties: Record<string, any> = {}, distinctId?: string) {
    if (!this.env.NEXT_PUBLIC_POSTHOG_HOST || !this.env.NEXT_PUBLIC_POSTHOG_KEY) {
      console.warn('PostHog not configured, skipping event:', eventName)
      return // Graceful degradation
    }

    const payload = {
      api_key: this.env.NEXT_PUBLIC_POSTHOG_KEY,
      event: eventName,
      distinct_id: distinctId || crypto.randomUUID(),
      properties: {
        $process_person_profile: false, // Privacy setting
        timestamp: new Date().toISOString(),
        ...properties,
      },
    }

    try {
      await fetch(`${this.env.NEXT_PUBLIC_POSTHOG_HOST}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      console.error('Failed to send analytics event:', error)
    }
  }
}

// Event naming constants following the pattern: {app_name}:{action}_{context}
export const ANALYTICS_EVENTS = {
  PROJECT_UPLOADED: 'vercel_app_deployment_demo:project_uploaded',
  PROJECT_CREATED: 'vercel_app_deployment_demo:new_project_created',
  PROJECT_DEPLOYED: 'vercel_app_deployment_demo:new_project_deployed',
  CLAIM_URL_GENERATED: 'vercel_app_deployment_demo:claim_url_generated',
  CLAIM_BUTTON_CLICKED: 'vercel_app_deployment_demo:claim_button_clicked',
  TEMPLATE_SELECTED: 'vercel_app_deployment_demo:template_selected',
  ACCESS_TOKEN_USED: 'vercel_app_deployment_demo:access_token_used',
  SESSION_STARTED: 'vercel_app_deployment_demo:session_started',
  PAGE_VIEW: 'vercel_app_deployment_demo:page_view',
} as const

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS]
