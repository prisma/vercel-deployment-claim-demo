import { type NextRequest, NextResponse } from "next/server";
import { VERCEL_API_URL } from "@/app/utils/constants";

const vercelToken = process.env.ACCESS_TOKEN;
const teamId = process.env.TEAM_ID;

if (!vercelToken) {
  throw new Error("ACCESS_TOKEN is required");
}

if (!teamId) {
  throw new Error("TEAM_ID is required");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      integrationIdOrSlug,
      integrationProductId,
      billingPlanId,
      region = "iad1"
    } = body;

    if (!integrationIdOrSlug) {
      return NextResponse.json(
        { error: "integrationIdOrSlug is required  aaaaa" },
        { status: 400 }
      );
    }

    if (!integrationProductId) {
      return NextResponse.json(
        { error: "integrationProductId is required" },
        { status: 400 }
      );
    }

    if (!billingPlanId) {
      return NextResponse.json(
        { error: "billingPlanId is required" },
        { status: 400 }
      );
    }

    const integrationConfigId = process.env.INTEGRATION_CONFIG_ID;
    if (!integrationConfigId) {
      return NextResponse.json(
        { error: "INTEGRATION_CONFIG_ID environment variable is required" },
        { status: 500 }
      );
    }

    const authorizationUrl = `${VERCEL_API_URL}/v1/integrations/billing/authorization?teamId=${teamId}`;

    const authorizationResponse = await fetch(authorizationUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        integrationIdOrSlug: integrationIdOrSlug,
        productId: integrationProductId,
        billingPlanId: billingPlanId,
        metadata: JSON.stringify({ region: region }),
        integrationConfigurationId: integrationConfigId,
      }),
    });

    if (!authorizationResponse.ok) {
      const errorData = await authorizationResponse.json();
      console.error('Failed to create authorization:', authorizationResponse.status, errorData);
      return NextResponse.json(
        {
          error: `Failed to create authorization: ${authorizationResponse.status}`,
          details: errorData
        },
        { status: authorizationResponse.status }
      );
    }

    const authorizationData = await authorizationResponse.json();
    console.log('Authorization created:', authorizationData);

    return NextResponse.json(authorizationData, { status: 200 });

  } catch (error) {
    console.error("Authorization creation error:", error);
    return NextResponse.json(
      { error: "Failed to create authorization" },
      { status: 500 }
    );
  }
}