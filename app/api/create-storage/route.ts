import { type NextRequest, NextResponse } from "next/server";
import { VERCEL_API_URL } from "@/app/utils/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      projectName,
      integrationProductId,
      authorizationId,
      billingPlanId,
      region = "iad1",
    } = body;

    const vercelToken = process.env.ACCESS_TOKEN;
    const teamId = process.env.TEAM_ID;
    const integrationConfigId = process.env.INTEGRATION_CONFIG_ID;

    if (!projectName) {
      return NextResponse.json(
        { error: "projectName is required" },
        { status: 400 }
      );
    }

    if (!integrationConfigId) {
      return NextResponse.json(
        { error: "INTEGRATION_CONFIG_ID environment variable is required" },
        { status: 500 }
      );
    }

    if (!integrationProductId) {
      return NextResponse.json(
        { error: "integrationProductId is required" },
        { status: 400 }
      );
    }

    if (!authorizationId) {
      return NextResponse.json(
        { error: "authorizationId is required" },
        { status: 400 }
      );
    }

    if (!billingPlanId) {
      return NextResponse.json(
        { error: "billingPlanId is required" },
        { status: 400 }
      );
    }

    if (!vercelToken) {
      return NextResponse.json(
        { error: "ACCESS_TOKEN environment variable is required" },
        { status: 500 }
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "TEAM_ID environment variable is required" },
        { status: 500 }
      );
    }

    const storageUrl = `${VERCEL_API_URL}/v1/storage/stores/integration?teamId=${teamId}`;

    const storageResponse = await fetch(storageUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metadata: { region },
        billingPlanId: billingPlanId,
        name: `prisma-postgres-${projectName}`,
        integrationConfigurationId: integrationConfigId,
        integrationProductIdOrSlug: integrationProductId,
        authorizationId: authorizationId,
        source: "marketplace",
      }),
    });

    if (!storageResponse.ok) {
      const errorData = await storageResponse.json();
      console.error(
        "Failed to create storage store:",
        storageResponse.status,
        errorData
      );
      return NextResponse.json(
        {
          error: `Failed to create storage store: ${storageResponse.status}`,
          details: errorData,
        },
        { status: storageResponse.status }
      );
    }

    const storageData = await storageResponse.json();
    console.log("Storage store created:", storageData);

    return NextResponse.json({ storage: storageData }, { status: 200 });
  } catch (error) {
    console.error("Storage store creation error:", error);
    return NextResponse.json(
      { error: "Failed to create storage store" },
      { status: 500 }
    );
  }
}
