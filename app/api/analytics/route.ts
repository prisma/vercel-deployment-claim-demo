import { NextRequest, NextResponse } from 'next/server'
import { PosthogEventCapture } from '@/lib/posthog'
import { geolocation, ipAddress } from '@vercel/functions'

export async function POST(request: NextRequest) {
  try {
    const { event, properties } = await request.json()

    if (!event) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
    }

    // Skip if PostHog is not configured
    if (!process.env.NEXT_PUBLIC_POSTHOG_HOST || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const analytics = new PosthogEventCapture({
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    })

    // Get geolocation data using Vercel functions
    let geoData = {}
    let clientIp = 'unknown'
    
    try {
      const geo = geolocation(request)
      const ip = ipAddress(request)
      
      geoData = {
        'geo-city': geo.city,
        'geo-country': geo.country,
        'geo-country-region': geo.countryRegion,
        'geo-region': geo.region, // Vercel Edge Network region
        'geo-latitude': geo.latitude,
        'geo-longitude': geo.longitude,
        'geo-postal-code': geo.postalCode,
        'geo-flag': geo.flag,
      }
      
      clientIp = ip || 'unknown'
    } catch (error) {
      // Fallback to headers if Vercel functions not available
      const forwardedFor = request.headers.get('x-forwarded-for')
      const realIp = request.headers.get('x-real-ip')
      clientIp = forwardedFor ? forwardedFor.split(',')[0] : realIp || 'unknown'
      
      // Try to get geo data from Vercel headers
      geoData = {
        'geo-city': request.headers.get('x-vercel-ip-city'),
        'geo-country': request.headers.get('x-vercel-ip-country'),
        'geo-country-region': request.headers.get('x-vercel-ip-country-region'),
      }
    }
    
    // Create a consistent distinct_id based on IP and user agent
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const distinctId = `web-${Buffer.from(clientIp + userAgent).toString('base64').slice(0, 16)}`

    await analytics.capture(event, {
      'client-ip': clientIp,
      'user-agent': userAgent,
      source: 'web-client',
      ...geoData,
      ...properties,
    }, distinctId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
