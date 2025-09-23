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
    const projectResponse = await fetch(`${baseUrl}/api/cleanup-projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (projectResponse.ok) {
      const projectData = await projectResponse.json();
      results.projects = projectData.results;
    } else {
      const errorData = await projectResponse.json();
      results.errors.push(`Project cleanup failed: ${errorData.error}`);
    }
  } catch (error) {
    results.errors.push(`Project cleanup error: ${(error as Error).message}`);
  }

  // Call storage cleanup
  try {
    const storageResponse = await fetch(`${baseUrl}/api/cleanup-storage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (storageResponse.ok) {
      const storageData = await storageResponse.json();
      results.storage = storageData.results;
    } else {
      const errorData = await storageResponse.json();
      results.errors.push(`Storage cleanup failed: ${errorData.error}`);
    }
  } catch (error) {
    results.errors.push(`Storage cleanup error: ${(error as Error).message}`);
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
        ? `Partial cleanup completed. Successful: ${successfulOperations.join(", ")}`
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
