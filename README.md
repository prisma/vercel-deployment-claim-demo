# Claim deployments demo

This application demonstrates how to transfer a Vercel project from one account to another using the [Claim Deployments](https://vercel.com/docs/deployments/claim-deployments) feature.

The demo covers the entire process, including creating a project in the host team, initiating the transfer, and enabling users to claim the project for themselves. Projects are created with Next.js templates that include Prisma Postgres integration and optional Better Auth authentication.

Try it out at: [https://claim-deployments-demo.vercel.app](https://claim-deployments-demo.vercel.app)

## Getting started

To set up the project, add the following environment variables to your `.env.local` file:

```bash
TEAM_ID=""
ACCESS_TOKEN=""
INTEGRATION_CONFIG_ID=""
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

Where to get it:

- Go to the [Tokens](https://vercel.com/account/settings/tokens) page in the Vercel Dashboard
- Generate a new access token
- Ensure that the token's scope matches the team where the projects will be transferred from

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

## Running the development server

Install dependencies:

```bash
pnpm install
```

Start the development server using your preferred package manager:

```bash
pnpm run dev
```

Once the server is running, open [http://localhost:3000](http://localhost:3000) in your browser to view the demo application.
