'use client'

import { usePageView } from '@/lib/posthog-provider'

export default function ClaimPageClient() {
  usePageView()
  return null
}
