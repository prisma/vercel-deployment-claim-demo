import { NextRequest, NextResponse } from "next/server";
import * as https from "https";
import { URL } from "url";

// Configuration
const VERCEL_API_BASE = "https://api.vercel.com";
const STORAGE_PREFIX = "prisma-postgres-temp-project";
const HOURS_THRESHOLD = 12;

// Types
interface StorageStore {
  id: string;
  name: string;
  createdAt: string;
  type: string;
  status: string;
}

interface StorageStoresResponse {
  stores: StorageStore[];
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
 * Fetch all storage stores from Vercel
 */
async function fetchAllStorageStores(): Promise<StorageStore[]> {
  try {
    const endpoint = `/v1/storage/stores`;
    const response: StorageStoresResponse = await makeApiRequest(endpoint);
    return response.stores || [];
  } catch (error) {
    console.error("Error fetching storage stores:", (error as Error).message);
    throw error;
  }
}

/**
 * Filter storage stores based on criteria
 */
function filterStorageStoresForDeletion(stores: StorageStore[]): StorageStore[] {
  const now = Date.now();
  const thresholdTime = now - HOURS_THRESHOLD * 60 * 60 * 1000;

  return stores.filter((store) => {
    // Check if store name starts with the prefix
    if (!store.name.startsWith(STORAGE_PREFIX)) {
      return false;
    }

    // Check if store is older than threshold
    const createdAt = new Date(store.createdAt).getTime();
    if (createdAt > thresholdTime) {
      return false;
    }

    return true;
  });
}

/**
 * Delete a single storage store
 */
async function deleteStorageStore(store: StorageStore): Promise<boolean> {
  try {
    await makeApiRequest(`/v1/storage/stores/${store.id}`, "DELETE");
    return true;
  } catch (error) {
    console.error(
      `Failed to delete storage store ${store.name}: ${(error as Error).message}`
    );
    return false;
  }
}

/**
 * Delete all filtered storage stores
 */
async function deleteStorageStores(
  stores: StorageStore[]
): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failureCount = 0;

  for (const store of stores) {
    const success = await deleteStorageStore(store);
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
async function performStorageCleanup() {
  const token = process.env.ACCESS_TOKEN;
  const teamId = process.env.TEAM_ID;

  if (!token) {
    throw new Error("ACCESS_TOKEN environment variable is required");
  }

  if (!teamId) {
    throw new Error("TEAM_ID environment variable is required");
  }

  // Fetch all storage stores
  const allStorageStores = await fetchAllStorageStores();

  // Filter storage stores for deletion
  const storageStoresToDelete = filterStorageStoresForDeletion(allStorageStores);

  // Delete storage stores
  const results = await deleteStorageStores(storageStoresToDelete);

  return {
    totalStores: allStorageStores.length,
    storesToDelete: storageStoresToDelete.length,
    successfulDeletions: results.success,
    failedDeletions: results.failed,
    deletedStores: storageStoresToDelete.slice(0, results.success).map((s) => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt,
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

    console.log("🚀 Starting automated Vercel storage cleanup...");

    const results = await performStorageCleanup();

    console.log("✅ Storage cleanup completed successfully:", results);

    return NextResponse.json({
      success: true,
      message: "Storage cleanup completed successfully",
      results,
    });
  } catch (error) {
    console.error("💥 Storage cleanup failed:", (error as Error).message);

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
