import { NextRequest, NextResponse } from "next/server";
import { VERCEL_API_URL } from "@/app/utils/constants";
import { trackAccessTokenUsage } from "@/lib/analytics-server";

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
    const { environmentVariables } = body;

    const projectPayload: any = {
      name: `temp-project-${generateRandomId(10)}`,
    };

    // Add environment variables if provided
    if (environmentVariables && Array.isArray(environmentVariables)) {
      projectPayload.environmentVariables = environmentVariables;
    }

    const url = `${VERCEL_API_URL}/v10/projects?teamId=${teamId}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectPayload),
    });

    // Track ACCESS_TOKEN usage
    await trackAccessTokenUsage('/api/create-project', 'POST', response.ok, req, {
      'project-name': projectPayload.name,
      'has-env-vars': !!(environmentVariables && environmentVariables.length > 0),
      'response-status': response.status,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Vercel API error:", response.status, errorData);
      return NextResponse.json(
        {
          error: `Failed to create project: ${response.status}`,
          details: errorData,
        },
        { status: response.status }
      );
    }

    const projectData = await response.json();
    return NextResponse.json(projectData, { status: 200 });
  } catch (error) {
    console.error("Project creation error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

function generateRandomId(length: number) {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let randomId = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomId += characters[randomIndex];
  }
  return randomId;
}
