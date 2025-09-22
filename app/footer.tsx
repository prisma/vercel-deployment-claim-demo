import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-8">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Learn more about this demo</h3>
        <p className="text-sm text-gray-600 mb-4">
          Interested in becoming a partner?{" "}
          <a
            href="https://www.prisma.io/partners"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Get in touch with us
          </a>
          .
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center space-x-6">
        <Link
          className="flex items-center hover:text-gray-600 transition-colors"
          href="https://github.com/prisma/vercel-deployment-claim-demo?utm_source=claim_deployments_demo&utm_medium=footer&utm_campaign=vercel_claim_partnership"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub Repository"
        >
          <Image
            alt="GitHub Repository"
            src="/icons/github.svg"
            width={20}
            height={20}
            className="shrink-0"
          />
          <span className="ml-2">GitHub Repository</span>
        </Link>
        <div className="h-6 w-px bg-gray-300" />
        <Link
          className="flex items-center hover:text-gray-600 transition-colors"
          href="https://pris.ly/claim-vercel-guide?utm_source=claim_deployments_demo&utm_medium=footer&utm_campaign=vercel_claim_partnership"
          target="_blank"
          rel="noopener noreferrer"
          title="Documentation"
        >
          <Image
            alt="Documentation"
            src="/icons/document.svg"
            width={20}
            height={20}
            className="shrink-0"
          />
          <span className="ml-2">Documentation</span>
        </Link>
        <div className="hidden sm:block h-6 w-px bg-gray-300" />
        <Link
          className="flex items-center hover:text-gray-600 transition-colors sm:w-auto w-full justify-center sm:justify-start pt-4 sm:pt-0"
          href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fprisma%2Fvercel-deployment-claim-demo&env=TEAM_ID,ACCESS_TOKEN,INTEGRATION_CONFIG_ID&project-name=claim-demo&integration-ids=iap_yVdbiKqs5fLkYDAB"
          target="_blank"
          rel="noopener noreferrer"
          title="Deploy to Vercel"
        >
          <Image
            alt="Deploy to Vercel"
            src="/icons/vercel-dark.svg"
            width={20}
            height={20}
            className="shrink-0"
          />
          <span className="ml-2">Deploy demo to Vercel</span>
        </Link>
      </div>
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Prisma Data, Inc.</p>
      </div>
    </footer>
  );
}
