# Claim deployments demo

This application demonstrates how to transfer a Vercel project from one account to another using the [Claim Deployments](https://vercel.com/docs/deployments/claim-deployments?utm_source=claim_deployments_demo&utm_medium=footer&utm_campaign=vercel_claim_partnership) feature.

The demo covers the entire process, including creating a project in the host team, initiating the transfer, and enabling users to claim the project for themselves. Projects are created with Next.js templates that include [Prisma Postgres](https://www.prisma.io/postgres?utm_source=claim_deployments_demo&utm_medium=footer&utm_campaign=vercel_claim_partnership) integration and optional Better Auth authentication.

Try it out at: [https://app-deploy-demo.prisma.io/](https://app-deploy-demo.prisma.io?utm_source=claim_deployments_demo&utm_medium=footer&utm_campaign=vercel_claim_partnership)

## Getting started

To set up the project, add the following environment variables to your `.env.local` file:

```bash
TEAM_ID=""
ACCESS_TOKEN=""
INTEGRATION_CONFIG_ID=""

# Configure these to match your Prisma setup
PRISMA_INTEGRATION_PRODUCT_ID="iap_yVdbiKqs5fLkYDAB"  # or "prisma-postgres"
DEFAULT_BILLING_PLAN_ID="business"  # Your actual Prisma plan
VERCEL_REGION="iad1"  # Your preferred region
```

### Required API keys and configuration

#### 1. Team ID

**Environment Variable:** `TEAM_ID`

Where to get it:

- Go to Vercel Dashboard
- Switch to your Team (not personal account)
- Go to Team Settings
- The Team ID is displayed at the top of the settings page
- It looks like: `team_abc123xyz`

#### 2. Access token

**Environment variable:** `ACCESS_TOKEN`

**⚠️ Important:** The access token must be created by someone with an **Owner** role in the Vercel team.

Where to get it:

- Go to the [Tokens](https://vercel.com/account/settings/tokens) page in the Vercel Dashboard
- Generate a new access token
- Ensure that the token's scope matches the team where the projects will be transferred from
- The token creator must have Owner permissions on the team

#### 3. Prisma integration config ID

**Environment variable:** `INTEGRATION_CONFIG_ID`

Where to get it:

- In Vercel Dashboard, go to your Team
- Click Integrations tab
- Find Prisma and click Configure (install it first if needed)
- In the URL, you'll see the config ID: `https://vercel.com/teams/your-team/integrations/icfg_abc123xyz`
- Copy the `icfg_abc123xyz` part

Example:

```bash
INTEGRATION_CONFIG_ID="icfg_abc123xyz"
```

### Additional Required Configuration

These variables have default values but should be configured to match your Prisma setup:

#### 4. Prisma Integration Product ID

**Environment variable:** `PRISMA_INTEGRATION_PRODUCT_ID`
**Default:** `"iap_yVdbiKqs5fLkYDAB"`

**Important:** Set this to match your Prisma integration. Use `"prisma-postgres"` if that's what your integration uses.

#### 5. Default Billing Plan ID

**Environment variable:** `DEFAULT_BILLING_PLAN_ID`
**Default:** `"business"`

**Important:** This must match your actual Prisma billing plan.

To find your Prisma billing plan:

1. Go to Vercel Dashboard → Your Team → "Integrations"
2. Click on **Prisma** integration and then click on "Settings"
3. Look for "Current Installation Level Plan" section
4. Set `DEFAULT_BILLING_PLAN_ID` to the exact plan name shown (e.g., "business", "pro", "enterprise")

#### 6. Vercel Region

**Environment variable:** `VERCEL_REGION`
**Default:** `"iad1"` (us-east-1, Washington, D.C., USA)

**Important:** Choose the region closest to your users for optimal performance.

Select a region from the [Vercel regions list](https://vercel.com/docs/regions#region-list) and set this value accordingly.

## Running the development server

After setting up the environment variables, install dependencies:

```bash
pnpm install
```

Start the development server using your preferred package manager:

```bash
pnpm run dev
```

Once the server is running, open [http://localhost:3000](http://localhost:3000) in your browser to view the demo application.
