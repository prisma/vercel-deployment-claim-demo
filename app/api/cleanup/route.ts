import { NextRequest, NextResponse } from "next/server";

/**
 * Main cleanup orchestrator that calls both project and storage cleanup endpoints
 */
async function performFullCleanup(baseUrl: string, authHeader: string | null) {
  const results = {
    projects: null as any,
    storage: null as any,
    errors: [] as string[],
  };

  // Call project cleanup
  try {
    console.log("🔄 Calling project cleanup endpoint...");
    const projectResponse = await fetch(`${baseUrl}/api/cleanup-projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    console.log("📊 Project cleanup response status:", projectResponse.status);
    const responseText = await projectResponse.text();
    console.log(
      "📝 Project cleanup response preview:",
      responseText.substring(0, 100)
    );

    if (projectResponse.ok) {
      try {
        const projectData = JSON.parse(responseText);
        results.projects = projectData.results;
        console.log("✅ Project cleanup successful");
      } catch (parseError) {
        results.errors.push(
          `Project cleanup response parsing failed: ${responseText.substring(
            0,
            200
          )}...`
        );
        console.log("❌ Project cleanup JSON parse failed");
      }
    } else {
      try {
        const errorData = JSON.parse(responseText);
        results.errors.push(
          `Project cleanup failed (${projectResponse.status}): ${errorData.error}`
        );
      } catch (parseError) {
        results.errors.push(
          `Project cleanup failed (${
            projectResponse.status
          }): ${responseText.substring(0, 200)}...`
        );
      }
      console.log(
        "❌ Project cleanup failed with status:",
        projectResponse.status
      );
    }
  } catch (error) {
    results.errors.push(`Project cleanup error: ${(error as Error).message}`);
    console.log("💥 Project cleanup threw error:", (error as Error).message);
  }

  // Call storage cleanup
  try {
    console.log("🔄 Calling storage cleanup endpoint...");
    const storageResponse = await fetch(`${baseUrl}/api/cleanup-storage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    console.log("📊 Storage cleanup response status:", storageResponse.status);
    const responseText = await storageResponse.text();
    console.log(
      "📝 Storage cleanup response preview:",
      responseText.substring(0, 100)
    );

    if (storageResponse.ok) {
      try {
        const storageData = JSON.parse(responseText);
        results.storage = storageData.results;
        console.log("✅ Storage cleanup successful");
      } catch (parseError) {
        results.errors.push(
          `Storage cleanup response parsing failed: ${responseText.substring(
            0,
            200
          )}...`
        );
        console.log("❌ Storage cleanup JSON parse failed");
      }
    } else {
      try {
        const errorData = JSON.parse(responseText);
        results.errors.push(
          `Storage cleanup failed (${storageResponse.status}): ${errorData.error}`
        );
      } catch (parseError) {
        results.errors.push(
          `Storage cleanup failed (${
            storageResponse.status
          }): ${responseText.substring(0, 200)}...`
        );
      }
      console.log(
        "❌ Storage cleanup failed with status:",
        storageResponse.status
      );
    }
  } catch (error) {
    results.errors.push(`Storage cleanup error: ${(error as Error).message}`);
    console.log("💥 Storage cleanup threw error:", (error as Error).message);
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized - Vercel automatically sends CRON_SECRET as Bearer token
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🚀 Starting full automated cleanup (projects + storage)...");

    // Get the base URL for internal API calls
    const baseUrl = request.nextUrl.origin;
    console.log("📍 Base URL for internal calls:", baseUrl);
    console.log("🔐 Auth header present:", !!authHeader);

    const results = await performFullCleanup(baseUrl, authHeader);

    const hasErrors = results.errors.length > 0;
    const successfulOperations = [
      results.projects ? "projects" : null,
      results.storage ? "storage" : null,
    ].filter(Boolean);

    console.log("✅ Full cleanup completed:", {
      successful: successfulOperations,
      errors: results.errors,
    });

    return NextResponse.json({
      success: !hasErrors || successfulOperations.length > 0,
      message: hasErrors
        ? `Partial cleanup completed. Successful: ${successfulOperations.join(
            ", "
          )}`
        : "Full cleanup completed successfully",
      results,
    });
  } catch (error) {
    console.error("💥 Full cleanup failed:", (error as Error).message);

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// Allow GET requests for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
