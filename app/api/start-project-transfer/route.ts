import { VERCEL_API_URL } from "@/app/utils/constants";
import { NextResponse } from "next/server";
import { trackAccessTokenUsage } from "@/lib/analytics-server";

const vercelToken = process.env.ACCESS_TOKEN;
const teamId = process.env.TEAM_ID;

if (!vercelToken) {
  throw new Error("ACCESS_TOKEN is required");
}

if (!teamId) {
  throw new Error("TEAM_ID is required");
}

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();

    console.log("Starting project transfer for:", projectId);

    const res = await fetch(
      `${VERCEL_API_URL}/v9/projects/${projectId}/transfer-request?teamId=${teamId}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${vercelToken}`,
        },
        body: JSON.stringify({}),
      }
    );

    const json = await res.json();

    // Track ACCESS_TOKEN usage for project transfer
    await trackAccessTokenUsage('/api/start-project-transfer', 'POST', res.ok, req, {
      'project-id': projectId,
      'response-status': res.status,
      'has-transfer-code': !!(json && json.code),
    });

    if (!res.ok) {
      console.error("Project transfer failed:", res.status, json);
    } else {
      console.log("Project transfer successful:", json);
    }

    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    console.error("Project transfer error:", error);
    return NextResponse.json(
      { error: "Failed to start project transfer" },
      { status: 500 }
    );
  }
}
