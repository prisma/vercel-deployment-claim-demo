export const VERCEL_API_URL = "https://vercel.com/api";

export const PRISMA_INTEGRATION_ID = "prisma";

/* The `PRISMA_INTEGRATION_PRODUCT_ID` also can be `prisma-postgres` */
export const PRISMA_INTEGRATION_PRODUCT_ID =
  process.env.PRISMA_INTEGRATION_PRODUCT_ID || "iap_yVdbiKqs5fLkYDAB";

export const DEFAULT_BILLING_PLAN_ID =
  process.env.DEFAULT_BILLING_PLAN_ID || "business";

export const DEFAULT_REGION = process.env.VERCEL_REGION || "iad1";
