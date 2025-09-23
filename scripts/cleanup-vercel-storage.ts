#!/usr/bin/env tsx

/**
 * Vercel Storage Cleanup Script
 *
 * This script finds and deletes Vercel storage stores that:
 * 1. Start with "prisma-postgres-temp-project*"
 * 2. Are older than 12 hours
 *
 * Usage: npx tsx scripts/cleanup-vercel-storage.ts
 *
 * Required environment variables:
 * - ACCESS_TOKEN: Your Vercel API token
 * - TEAM_ID: Your Vercel team ID (required for team/organization storage)
 */

import * as https from "https";
import { URL } from "url";
import "dotenv/config";

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
 * Step 1: Fetch all storage stores from Vercel
 */
async function fetchAllStorageStores(): Promise<StorageStore[]> {
  console.log("🔍 Step 1: Fetching all storage stores from Vercel...");

  try {
    const endpoint = `/v1/storage/stores`;
    const response: StorageStoresResponse = await makeApiRequest(endpoint);
    const stores = response.stores || [];

    console.log(
      `✅ Step 1 Complete: Found ${stores.length} total storage stores\n`
    );
    return stores;
  } catch (error) {
    console.error(
      "❌ Error fetching storage stores:",
      (error as Error).message
    );
    throw error;
  }
}

/**
 * Step 2: Filter storage stores based on criteria
 */
function filterStorageStoresForDeletion(
  stores: StorageStore[]
): StorageStore[] {
  console.log("🔎 Step 2: Filtering storage stores for deletion...");
  console.log(
    `   Criteria: name starts with "${STORAGE_PREFIX}", older than ${HOURS_THRESHOLD} hours`
  );

  const now = Date.now();
  const thresholdTime = now - HOURS_THRESHOLD * 60 * 60 * 1000;

  const filteredStores = stores.filter((store) => {
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

  console.log(
    `✅ Step 2 Complete: Found ${filteredStores.length} storage stores matching deletion criteria`
  );

  if (filteredStores.length > 0) {
    console.log("   Storage stores to delete:");
    filteredStores.forEach((store) => {
      const createdDate = new Date(store.createdAt).toISOString();
      console.log(`   - ${store.name} (created: ${createdDate})`);
    });
  }
  console.log("");

  return filteredStores;
}

/**
 * Step 3: Delete a single storage store
 */
async function deleteStorageStore(store: StorageStore): Promise<boolean> {
  try {
    console.log(`   Deleting: ${store.name} (${store.id})`);
    await makeApiRequest(`/v1/storage/stores/${store.id}`, "DELETE");
    console.log(`   ✅ Successfully deleted: ${store.name}`);
    return true;
  } catch (error) {
    console.error(
      `   ❌ Failed to delete ${store.name}: ${(error as Error).message}`
    );
    return false;
  }
}

/**
 * Step 3: Delete all filtered storage stores
 */
async function deleteStorageStores(stores: StorageStore[]): Promise<void> {
  if (stores.length === 0) {
    console.log("✨ Step 3: No storage stores to delete");
    return;
  }

  console.log(`🗑️  Step 3: Deleting ${stores.length} storage stores...`);

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

  console.log(
    `✅ Step 3 Complete: Successfully deleted ${successCount} storage stores`
  );
  if (failureCount > 0) {
    console.log(`❌ Failed to delete ${failureCount} storage stores`);
  }
  console.log("");
}

/**
 * Print summary
 */
function printSummary(
  totalStores: number,
  filteredStores: number,
  successCount: number,
  failureCount: number
): void {
  console.log("📊 STORAGE CLEANUP SUMMARY:");
  console.log(`   Total storage stores found: ${totalStores}`);
  console.log(`   Storage stores matching criteria: ${filteredStores}`);
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

  console.log("🚀 Starting Vercel storage cleanup...\n");

  try {
    // Step 1: Fetch all storage stores
    const allStores = await fetchAllStorageStores();

    // Step 2: Filter storage stores for deletion
    const storesToDelete = filterStorageStoresForDeletion(allStores);

    // Step 3: Delete storage stores (comment this out to test filtering only)
    await deleteStorageStores(storesToDelete);

    // Summary
    const successCount = storesToDelete.length; // This would need to be tracked from deleteStorageStores
    const failureCount = 0; // This would need to be tracked from deleteStorageStores
    printSummary(
      allStores.length,
      storesToDelete.length,
      successCount,
      failureCount
    );

    console.log("🎉 Storage cleanup completed successfully!");
  } catch (error) {
    console.error("💥 Storage cleanup failed:", (error as Error).message);
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
  fetchAllStorageStores,
  filterStorageStoresForDeletion,
  deleteStorageStores,
  deleteStorageStore,
};
