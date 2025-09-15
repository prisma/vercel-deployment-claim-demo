import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { VERCEL_API_URL } from "@/app/utils/constants";

const token = process.env.ACCESS_TOKEN;
const teamId = process.env.TEAM_ID;

if (!token) {
  throw new Error("ACCESS_TOKEN is required");
}

if (!teamId) {
  throw new Error("TEAM_ID is required");
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get("projectName");

    if (!projectName) {
      return NextResponse.json(
        { error: "projectName is required" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const templateKey = formData.get("template") as string;
    const file = formData.get("file") as File;

    let localFileBuffer: Buffer | undefined;
    let localFileSha: string | undefined;
    let fileSha: string | undefined;

    if (templateKey) {
      const templateFilePath = path.join(
        process.cwd(),
        "templates",
        `${templateKey}.tgz`
      );
      try {
        localFileBuffer = await fs.readFile(templateFilePath);
        localFileSha = crypto
          .createHash("sha1")
          .update(localFileBuffer)
          .digest("hex");
      } catch (err) {
        console.error(`Error reading template file: ${(err as Error).message}`);
        return NextResponse.json(
          { error: `Template file '${templateKey}' not found` },
          { status: 400 }
        );
      }
    } else {
      const fileArrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(fileArrayBuffer);
      fileSha = crypto.createHash("sha1").update(fileBuffer).digest("hex");
    }

    const uploadResponse = await fetch(
      `${VERCEL_API_URL}/v2/files?teamId=${teamId}`,
      {
        method: "POST",
        body: localFileBuffer ? new Uint8Array(localFileBuffer) : file,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "x-vercel-digest": (localFileSha || fileSha) as string,
        },
      }
    );

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    const deploymentPayload: {
      files: Array<{ file: string; sha: string }>;
      name: string;
      projectSettings: {
        framework: string;
        installCommand?: string;
      };
      project: string;
    } = {
      files: [
        {
          file: ".vercel/source.tgz",
          sha: (localFileSha || fileSha) as string,
        },
      ],
      name: `deployment-${Date.now()}`,
      projectSettings: {
        framework: templateKey === "nextjs_with_prisma" ? "nextjs" : (templateKey || "nextjs"),
      },
      project: projectName,
    };

    const deploymentResponse = await fetch(
      `${VERCEL_API_URL}/v13/deployments?teamId=${teamId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deploymentPayload),
      }
    );

    if (!deploymentResponse.ok) {
      const errorData = await deploymentResponse.json();
      console.error('Deployment error:', deploymentResponse.status, errorData);
      return NextResponse.json(
        { error: "Failed to create deployment", details: errorData },
        { status: deploymentResponse.status }
      );
    }

    return NextResponse.json(
      { deployment: await deploymentResponse.json() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Deployment error:", error);
    return NextResponse.json(
      { error: "Failed to create deployment" },
      { status: 500 }
    );
  }
}
