import { PosthogEventCapture, ANALYTICS_EVENTS } from "./posthog";
import { geolocation, ipAddress } from "@vercel/functions";

// Server-side analytics utility for API routes
export async function trackAccessTokenUsage(
  endpoint: string,
  method: string,
  success: boolean,
  request?: Request,
  additionalProperties: Record<string, any> = {}
) {
  // Skip if PostHog is not configured
  if (
    !process.env.NEXT_PUBLIC_POSTHOG_HOST ||
    !process.env.NEXT_PUBLIC_POSTHOG_KEY
  ) {
    return;
  }

  const analytics = new PosthogEventCapture({
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  });

  // Get geolocation data if request is provided
  let geoData = {};
  if (request) {
    try {
      const geo = geolocation(request);
      geoData = {
        "geo-city": geo.city,
        "geo-country": geo.country,
        "geo-country-region": geo.countryRegion,
        "geo-region": geo.region,
        "geo-latitude": geo.latitude,
        "geo-longitude": geo.longitude,
      };
    } catch (error) {
      // Fallback to headers if available
      if (request.headers) {
        geoData = {
          "geo-city": request.headers.get("x-vercel-ip-city"),
          "geo-country": request.headers.get("x-vercel-ip-country"),
          "geo-country-region": request.headers.get(
            "x-vercel-ip-country-region"
          ),
        };
      }
    }
  }

  await analytics.capture(ANALYTICS_EVENTS.ACCESS_TOKEN_USED, {
    endpoint,
    method,
    success,
    "has-access-token": !!process.env.ACCESS_TOKEN,
    "has-team-id": !!process.env.TEAM_ID,
    ...geoData,
    ...additionalProperties,
  });
}

export async function trackApiCall(
  event: string,
  endpoint: string,
  method: string,
  success: boolean,
  request?: Request,
  additionalProperties: Record<string, any> = {}
) {
  // Skip if PostHog is not configured
  if (
    !process.env.NEXT_PUBLIC_POSTHOG_HOST ||
    !process.env.NEXT_PUBLIC_POSTHOG_KEY
  ) {
    return;
  }

  const analytics = new PosthogEventCapture({
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  });

  // Get geolocation data if request is provided
  let geoData = {};
  if (request) {
    try {
      const geo = geolocation(request);
      geoData = {
        "geo-city": geo.city,
        "geo-country": geo.country,
        "geo-country-region": geo.countryRegion,
        "geo-region": geo.region,
        "geo-latitude": geo.latitude,
        "geo-longitude": geo.longitude,
      };
    } catch (error) {
      // Fallback to headers if available
      if (request.headers) {
        geoData = {
          "geo-city": request.headers.get("x-vercel-ip-city"),
          "geo-country": request.headers.get("x-vercel-ip-country"),
          "geo-country-region": request.headers.get(
            "x-vercel-ip-country-region"
          ),
        };
      }
    }
  }

  await analytics.capture(event, {
    endpoint,
    method,
    success,
    timestamp: new Date().toISOString(),
    ...geoData,
    ...additionalProperties,
  });
}
