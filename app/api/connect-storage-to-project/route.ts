import { type NextRequest, NextResponse } from "next/server";
import { PRISMA_INTEGRATION_PRODUCT_ID } from "@/app/utils/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { storeId, projectId } = body;

    // Use server-side constant
    const integrationProductId = PRISMA_INTEGRATION_PRODUCT_ID;

    const vercelToken = process.env.ACCESS_TOKEN;
    const teamId = process.env.TEAM_ID;
    const integrationConfigId = process.env.INTEGRATION_CONFIG_ID;

    if (!integrationConfigId) {
      return NextResponse.json(
        { error: "INTEGRATION_CONFIG_ID environment variable is required" },
        { status: 500 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId is required" },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
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

    const connectionUrl = `https://api.vercel.com/v1/integrations/installations/${integrationConfigId}/products/${integrationProductId}/resources/${storeId}/connections?teamId=${teamId}`;

    const connectionResponse = await fetch(connectionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: projectId,
      }),
    });

    if (!connectionResponse.ok) {
      const errorData = await connectionResponse.json();
      console.error(
        "Failed to connect storage store to project:",
        connectionResponse.status,
        errorData
      );
      return NextResponse.json(
        {
          error: `Failed to connect storage store to project: ${connectionResponse.status}`,
          details: errorData,
        },
        { status: connectionResponse.status }
      );
    }

    let connectionData = null;
    try {
      const responseText = await connectionResponse.text();
      if (responseText) {
        connectionData = JSON.parse(responseText);
      }
    } catch {
      console.log(
        "Connection response was empty or not JSON, but connection succeeded"
      );
    }

    console.log("Storage store connected to project");

    return NextResponse.json({ connection: connectionData }, { status: 200 });
  } catch (error) {
    console.error("Storage connection error:", error);
    return NextResponse.json(
      { error: "Failed to connect storage store to project" },
      { status: 500 }
    );
  }
}
