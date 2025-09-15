# Claim Deployments Demo

This application demonstrates how to transfer a Vercel project from one account to another using the [Claim Deployments](https://vercel.com/docs/deployments/claim-deployments) feature.

The demo covers the entire process, including creating a project in the host team, initiating the transfer, and enabling users to claim the project for themselves.

Try it out at: [https://claim-deployments-demo.vercel.app](https://claim-deployments-demo.vercel.app)

## Getting Started

To set up the project, add the following environment variables to your `.env.local` file:

```bash
TEAM_ID=""
ACCESS_TOKEN=""
INTEGRATION_CONFIG_ID=""
```

- `TEAM_ID`: The ID of the team where projects will be tranferred from. You can find this in the Vercel Dashboard under **Team Settings**.
- `ACCESS_TOKEN`: An access token used to interact with Vercel's REST API. You can generate one from the [Tokens](https://vercel.com/account/settings/tokens) page in the Vercel Dashboard. Ensure that the token's scope matches the team where the projects will be transferred from.
- `INTEGRATION_CONFIG_ID`: The integration configuration ID of the Prisma installation on the team. You can find it by going to the Integrations tab of your team and clicking on Prisma (after installing it). The id (starts with `icfg_` will be in the URL).

## Running the Development Server

Start the development server using your preferred package manager:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Once the server is running, open [http://localhost:3000](http://localhost:3000) in your browser to view the demo application.
