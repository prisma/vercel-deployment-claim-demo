"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { generatePreview } from "../actions/generate-preview";

interface WebsitePreviewProps {
  url: string;
  deploymentUrl?: string;
  framework?: string;
}

function BrowserHeader({ url, isLive = false }: { url: string; isLive?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-0 bg-gray-100 rounded-t-lg border-b">
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
      </div>
      <div className="flex-1 mr-2 ml-2 min-w-0">
        <div className="bg-white rounded-md px-3 py-1.5 text-sm text-gray-600 border truncate flex items-center">
          {isLive && (
            <div className="flex items-center mr-2 flex-shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5" style={{ animation: 'pulse 1s infinite' }}></div>
              <span className="text-xs text-green-600 font-medium">LIVE</span>
            </div>
          )}
          <span className="truncate">{url}</span>
        </div>
      </div>
      <div className="flex-shrink-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Open in new tab"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Open in new tab">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export default function WebsitePreview({
  url,
  deploymentUrl,
  framework
}: WebsitePreviewProps) {
  // Determine mode based on framework
  const effectiveMode = "screenshot"; // framework === "nextjs_with_prisma" ? "iframe" : "screenshot";
  // Use deployment URL for screenshots, public URL for iframe
  const effectiveUrl = framework === "nextjs_with_prisma" ? url : (deploymentUrl || url);
  const [iframeError, setIframeError] = useState(false);
  const [screenshotData, setScreenshotData] = useState<{
    imageUrl?: string;
    error?: string;
  } | null>(null);
  const [isLoadingScreenshot, setIsLoadingScreenshot] = useState(effectiveMode === "screenshot");

  const handleScreenshotMode = useCallback(async () => {
    if (screenshotData || !effectiveUrl) return;

    setIsLoadingScreenshot(true);
    try {
      const result = await generatePreview(effectiveUrl);
      setScreenshotData(result);
    } catch {
      setScreenshotData({ error: "Failed to generate screenshot" });
    } finally {
      setIsLoadingScreenshot(false);
    }
  }, [effectiveUrl, screenshotData]);

  useEffect(() => {
    if (effectiveMode === "screenshot") {
      handleScreenshotMode();
    }
  }, [handleScreenshotMode]);

  if (effectiveMode === "screenshot") {

    if (isLoadingScreenshot) {
      return (
        <div className="w-full rounded-lg border bg-white shadow-sm">
          <BrowserHeader url={effectiveUrl} />
          <div className="h-[400px] flex items-center justify-center bg-gray-50">
            <p className="text-sm text-gray-600">Generating screenshot...</p>
          </div>
        </div>
      );
    }

    if (screenshotData?.error) {
      return (
        <div className="w-full rounded-lg border bg-white shadow-sm">
          <BrowserHeader url={effectiveUrl} />
          <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
            <p className="text-gray-600 text-center">{screenshotData.error}</p>
            <a
              href={effectiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open in New Tab
            </a>
          </div>
        </div>
      );
    }

    if (screenshotData?.imageUrl) {
      return (
        <div className="w-full rounded-lg border bg-white shadow-sm">
          <BrowserHeader url={effectiveUrl} />
          <div className="rounded-b-lg overflow-hidden">
            <Image
              src={screenshotData.imageUrl}
              alt="Website preview"
              width={1280}
              height={720}
              className="h-[400px] w-full object-cover"
            />
          </div>
        </div>
      );
    }

    return null;
  }

  // Iframe mode (default) with browser chrome
  if (iframeError) {
    return (
      <div className="w-full rounded-lg border bg-white shadow-sm">
        <BrowserHeader url={effectiveUrl} isLive={true} />
        <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
          <p className="text-gray-600 text-center">
            This site cannot be displayed in a frame.
          </p>
          <a
            href={effectiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open in New Tab
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border bg-white shadow-sm">
      <BrowserHeader url={effectiveUrl} isLive={true} />
      <iframe
        src={effectiveUrl}
        className="w-full h-[400px] rounded-b-lg"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
        title="Website preview"
        onError={() => setIframeError(true)}
      />
    </div>
  );
}
