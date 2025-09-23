import { NextRequest, NextResponse } from "next/server";
import * as https from "https";
import { URL } from "url";

// Configuration
const VERCEL_API_BASE = "https://api.vercel.com";
const PROJECT_PREFIX = "temp-project";
const HOURS_THRESHOLD = 12;
const REPO_URL = "https://github.com/prisma/vercel-deployment-claim-demo";

// Types
interface Project {
  id: string;
  name: string;
  createdAt: number;
  link?: {
    org: string;
    repo: string;
    type: string;
  };
}

interface ProjectsResponse {
  projects: Project[];
  pagination?: {
    count: number;
    next?: number;
    prev?: number;
  };
}

/**
 * Make HTTP request to Vercel API
 */
async function makeApiRequest(
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const token = process.env.ACCESS_TOKEN;
  const teamId = process.env.TEAM_ID;

  if (!token) {
    throw new Error("ACCESS_TOKEN environment variable is required");
  }

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, VERCEL_API_BASE);

    // Add team ID as query parameter if provided
    if (teamId) {
      url.searchParams.append("teamId", teamId);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    if (body && method !== "GET") {
      const bodyString = JSON.stringify(body);
      headers["Content-Length"] = Buffer.byteLength(bodyString).toString();
    }

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = data ? JSON.parse(data) : {};
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(
              new Error(
                `HTTP ${res.statusCode}: ${response.error?.message || data}`
              )
            );
          }
        } catch (error) {
          reject(
            new Error(`Failed to parse response: ${(error as Error).message}`)
          );
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (body && method !== "GET") {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Fetch all projects from Vercel
 */
async function fetchAllProjects(): Promise<Project[]> {
  const allProjects: Project[] = [];
  let hasMore = true;
  let nextCursor: number | null = null;

  while (hasMore) {
    const queryParams = new URLSearchParams();
    if (nextCursor) {
      queryParams.append("until", nextCursor.toString());
    }
    queryParams.append("limit", "100");

    const endpoint = `/v9/projects?${queryParams.toString()}`;
    const response: ProjectsResponse = await makeApiRequest(endpoint);

    if (response.projects && response.projects.length > 0) {
      allProjects.push(...response.projects);

      if (response.pagination && response.pagination.next) {
        nextCursor = response.pagination.next;
      } else {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allProjects;
}

/**
 * Filter projects based on criteria
 */
function filterProjectsForDeletion(projects: Project[]): Project[] {
  const now = Date.now();
  const thresholdTime = now - HOURS_THRESHOLD * 60 * 60 * 1000;

  return projects.filter((project) => {
    // Check if project name starts with the prefix
    if (!project.name.startsWith(PROJECT_PREFIX)) {
      return false;
    }

    // Check if project is older than threshold
    if (project.createdAt > thresholdTime) {
      return false;
    }

    // Check if project is linked to our repository
    if (project.link && project.link.repo) {
      const projectRepoUrl = `https://github.com/${project.link.org}/${project.link.repo}`;
      if (projectRepoUrl !== REPO_URL) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Delete a single project
 */
async function deleteProject(project: Project): Promise<boolean> {
  try {
    await makeApiRequest(`/v9/projects/${project.id}`, "DELETE");
    return true;
  } catch (error) {
    console.error(
      `Failed to delete ${project.name}: ${(error as Error).message}`
    );
    return false;
  }
}

/**
 * Delete all filtered projects
 */
async function deleteProjects(
  projects: Project[]
): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failureCount = 0;

  for (const project of projects) {
    const success = await deleteProject(project);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }

    // Add a small delay between deletions to be respectful to the API
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { success: successCount, failed: failureCount };
}

/**
 * Main cleanup function
 */
async function performCleanup() {
  const token = process.env.ACCESS_TOKEN;
  const teamId = process.env.TEAM_ID;

  if (!token) {
    throw new Error("ACCESS_TOKEN environment variable is required");
  }

  if (!teamId) {
    throw new Error("TEAM_ID environment variable is required");
  }

  // Fetch all projects
  const allProjects = await fetchAllProjects();

  // Filter projects for deletion
  const projectsToDelete = filterProjectsForDeletion(allProjects);

  // Delete projects
  const results = await deleteProjects(projectsToDelete);

  return {
    totalProjects: allProjects.length,
    projectsToDelete: projectsToDelete.length,
    successfulDeletions: results.success,
    failedDeletions: results.failed,
    deletedProjects: projectsToDelete.slice(0, results.success).map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: new Date(p.createdAt).toISOString(),
    })),
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized - Vercel automatically sends CRON_SECRET as Bearer token
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🚀 Starting automated Vercel project cleanup...");

    const results = await performCleanup();

    console.log("✅ Cleanup completed successfully:", results);

    return NextResponse.json({
      success: true,
      message: "Cleanup completed successfully",
      results,
    });
  } catch (error) {
    console.error("💥 Cleanup failed:", (error as Error).message);

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
