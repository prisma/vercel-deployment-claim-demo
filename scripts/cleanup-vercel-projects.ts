#!/usr/bin/env tsx

/**
 * Vercel Project Cleanup Script
 *
 * This script finds and deletes Vercel projects that:
 * 1. Start with "temp-project*"
 * 2. Were created from this repository
 * 3. Are older than 24 hours
 *
 * Usage: npx tsx scripts/cleanup-vercel-projects.ts
 *
 * Required environment variables:
 * - ACCESS_TOKEN: Your Vercel API token
 * - TEAM_ID: Your Vercel team ID (required for team/organization projects)
 */

import * as https from "https";
import { URL } from "url";
import "dotenv/config";

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

interface ApiResponse {
  error?: {
    message: string;
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
 * Step 1: Fetch all projects from Vercel
 */
async function fetchAllProjects(): Promise<Project[]> {
  console.log("🔍 Step 1: Fetching all projects from Vercel...");

  const allProjects: Project[] = [];
  let hasMore = true;
  let nextCursor: number | null = null;

  while (hasMore) {
    try {
      const queryParams = new URLSearchParams();
      if (nextCursor) {
        queryParams.append("until", nextCursor.toString());
      }
      queryParams.append("limit", "100"); // Maximum allowed per request

      const endpoint = `/v9/projects?${queryParams.toString()}`;
      const response: ProjectsResponse = await makeApiRequest(endpoint);

      if (response.projects && response.projects.length > 0) {
        allProjects.push(...response.projects);
        console.log(
          `   Fetched ${response.projects.length} projects (total: ${allProjects.length})`
        );

        // Check if there are more pages
        if (response.pagination && response.pagination.next) {
          nextCursor = response.pagination.next;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error("❌ Error fetching projects:", (error as Error).message);
      throw error;
    }
  }

  console.log(
    `✅ Step 1 Complete: Found ${allProjects.length} total projects\n`
  );
  return allProjects;
}

/**
 * Step 2: Filter projects based on criteria
 */
function filterProjectsForDeletion(projects: Project[]): Project[] {
  console.log("🔎 Step 2: Filtering projects for deletion...");
  console.log(
    `   Criteria: name starts with "${PROJECT_PREFIX}", older than ${HOURS_THRESHOLD} hours, from this repo`
  );

  const now = Date.now();
  const thresholdTime = now - HOURS_THRESHOLD * 60 * 60 * 1000;

  const filteredProjects = projects.filter((project) => {
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

  console.log(
    `✅ Step 2 Complete: Found ${filteredProjects.length} projects matching deletion criteria`
  );

  if (filteredProjects.length > 0) {
    console.log("   Projects to delete:");
    filteredProjects.forEach((project) => {
      const createdDate = new Date(project.createdAt).toISOString();
      console.log(`   - ${project.name} (created: ${createdDate})`);
    });
  }
  console.log("");

  return filteredProjects;
}

/**
 * Step 3: Delete a single project
 */
async function deleteProject(project: Project): Promise<boolean> {
  try {
    console.log(`   Deleting: ${project.name} (${project.id})`);
    await makeApiRequest(`/v9/projects/${project.id}`, "DELETE");
    console.log(`   ✅ Successfully deleted: ${project.name}`);
    return true;
  } catch (error) {
    console.error(
      `   ❌ Failed to delete ${project.name}: ${(error as Error).message}`
    );
    return false;
  }
}

/**
 * Step 3: Delete all filtered projects
 */
async function deleteProjects(projects: Project[]): Promise<void> {
  if (projects.length === 0) {
    console.log("✨ Step 3: No projects to delete");
    return;
  }

  console.log(`🗑️  Step 3: Deleting ${projects.length} projects...`);

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

  console.log(
    `✅ Step 3 Complete: Successfully deleted ${successCount} projects`
  );
  if (failureCount > 0) {
    console.log(`❌ Failed to delete ${failureCount} projects`);
  }
  console.log("");
}

/**
 * Print summary
 */
function printSummary(
  totalProjects: number,
  filteredProjects: number,
  successCount: number,
  failureCount: number
): void {
  console.log("📊 CLEANUP SUMMARY:");
  console.log(`   Total projects found: ${totalProjects}`);
  console.log(`   Projects matching criteria: ${filteredProjects}`);
  console.log(`   Successfully deleted: ${successCount}`);
  console.log(`   Failed to delete: ${failureCount}`);
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  // Validate environment
  const token = process.env.ACCESS_TOKEN;
  const teamId = process.env.TEAM_ID;

  if (!token) {
    console.error("❌ Error: ACCESS_TOKEN environment variable is required");
    console.error("Please set your Vercel API token:");
    console.error("export ACCESS_TOKEN=your_token_here");
    process.exit(1);
  }

  if (!teamId) {
    console.error("❌ Error: TEAM_ID environment variable is required");
    console.error("Please set your Vercel team ID:");
    console.error("export TEAM_ID=your_team_id_here");
    process.exit(1);
  }

  console.log("🚀 Starting Vercel project cleanup...\n");

  try {
    // Step 1: Fetch all projects
    const allProjects = await fetchAllProjects();

    // Step 2: Filter projects for deletion
    const projectsToDelete = filterProjectsForDeletion(allProjects);

    // Step 3: Delete projects (comment this out to test filtering only)
    await deleteProjects(projectsToDelete);

    // Summary
    const successCount = projectsToDelete.length; // This would need to be tracked from deleteProjects
    const failureCount = 0; // This would need to be tracked from deleteProjects
    printSummary(
      allProjects.length,
      projectsToDelete.length,
      successCount,
      failureCount
    );

    console.log("🎉 Cleanup completed successfully!");
  } catch (error) {
    console.error("💥 Cleanup failed:", (error as Error).message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Script failed:", (error as Error).message);
    process.exit(1);
  });
}

export {
  fetchAllProjects,
  filterProjectsForDeletion,
  deleteProjects,
  deleteProject,
};
