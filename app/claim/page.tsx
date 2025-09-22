import { Suspense } from "react";
import ClaimDeploymentButton from "./claim-deployment-button";
import WebsitePreview from "./website-preview";
import WebsitePreviewSkeleton from "./website-preview-skeleton";
import ClaimPageClient from "./claim-page-client";

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{
    code: string;
    previewUrl: string;
    deploymentUrl?: string;
    framework?: string;
  }>;
}) {
  const { code, previewUrl, deploymentUrl, framework } = await searchParams;

  if (!code || !previewUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Link
            </h1>
            <p className="text-gray-600">
              This claim link appears to be invalid or expired.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col grow space-y-6">
      <ClaimPageClient />
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-neutral-800">
          Your Deployment is Ready
        </h2>
      </div>
      <Suspense fallback={<WebsitePreviewSkeleton />}>
        <WebsitePreview
          url={previewUrl}
          deploymentUrl={deploymentUrl}
          framework={framework}
        />
      </Suspense>
      <p className="text-sm text-neutral-700">
        By claiming this deployment, you&apos;ll be able to manage it from your
        own account and make future updates.
      </p>
      <ClaimDeploymentButton code={code} />
    </div>
  );
}
