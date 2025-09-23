'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'never', // Privacy-first approach
    capture_pageview: false, // We'll handle this manually
    capture_pageleave: true,
  })
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}

// Client-side analytics helper
export const sendAnalyticsEvent = async (
  event: string,
  properties: Record<string, any> = {}
) => {
  // Skip if PostHog is not configured
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !process.env.NEXT_PUBLIC_POSTHOG_HOST) {
    return
  }
  
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, properties }),
    })
  } catch (error) {
    console.error('Failed to send analytics event:', error)
  }
}

// Hook for tracking page views
export function usePageView() {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
      const trackPageView = () => {
        const url = new URL(window.location.href)
        const utmParams = {
          'utm-source': url.searchParams.get('utm_source'),
          'utm-medium': url.searchParams.get('utm_medium'),
          'utm-campaign': url.searchParams.get('utm_campaign'),
          'utm-term': url.searchParams.get('utm_term'),
          'utm-content': url.searchParams.get('utm_content'),
        }

        // Filter out null values
        const cleanUtmParams = Object.fromEntries(
          Object.entries(utmParams).filter(([_, value]) => value !== null)
        )

        sendAnalyticsEvent('vercel_app_deployment_demo:page_view', {
          pathname: window.location.pathname,
          referrer: document.referrer,
          'user-agent': navigator.userAgent,
          ...cleanUtmParams,
        })
      }

      trackPageView()
    }
  }, [])
}
