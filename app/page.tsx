"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { BuildLogs } from "@/components/build-logs";
import LoadingSpinner from "@/components/loading-spinner";
import { ProgressBar } from "@/components/progress-bar";
import { DeploymentStep } from "@/types/deployment";
import Footer from "@/app/footer";

const TIMEOUT_MS = 4 * 60 * 1000;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>("nextjs_with_prisma");
  const [activeTab, setActiveTab] = useState("template");
  const router = useRouter();
  const [deployment, setDeployment] = useState(null);
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>(DeploymentStep.IDLE);

  const onDrop = (acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
    setSelectedTemplate(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/gzip": [".tgz"],
    },
  });

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file && !selectedTemplate) return;

    setDeploymentStep(DeploymentStep.CREATING_PROJECT);
    setError("");

    const formData = new FormData();

    if (file) {
      formData.append("file", file);
    } else if (selectedTemplate) {
      formData.append("template", selectedTemplate);
    }

    try {
      // Prepare environment variables for Better Auth template
      const environmentVariables = [];
      if (selectedTemplate === "nextjs_with_prisma_and_better_auth") {
        // Generate a random BETTER_AUTH_SECRET
        const betterAuthSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        environmentVariables.push({
          key: "BETTER_AUTH_SECRET",
          value: betterAuthSecret,
          target: ["production", "preview", "development"],
          type: "encrypted"
        });
      }

      // First create the project
      const projectResponse = await fetch("/api/create-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template: selectedTemplate,
          environmentVariables: environmentVariables.length > 0 ? environmentVariables : undefined
        }),
      });

      if (!projectResponse.ok) {
        const projectError = await projectResponse.json();
        setError(projectError.error || "Failed to create project");
        setDeploymentStep(DeploymentStep.IDLE);
        return;
      }

      const projectData = await projectResponse.json();

      // Create authorization if Next.js + Prisma template is selected (including Better Auth)
      if (selectedTemplate === "nextjs_with_prisma" || selectedTemplate === "nextjs_with_prisma_and_better_auth") {
        setDeploymentStep(DeploymentStep.CREATING_AUTHORIZATION);
        try {
          const authorizationResponse = await fetch("/api/create-authorization", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}), // All values now handled server-side
          });

          if (!authorizationResponse.ok) {
            const authError = await authorizationResponse.json();
            console.error('Authorization creation failed:', authError);
            setError(authError.error || "Failed to create authorization");
            setDeploymentStep(DeploymentStep.IDLE);
            return;
          }

          const authorizationData = await authorizationResponse.json();
          console.log('Authorization created:', authorizationData);

          // Create storage store
          setDeploymentStep(DeploymentStep.CREATING_STORAGE);
          try {
            const storageResponse = await fetch("/api/create-storage", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                projectName: projectData.name,
                authorizationId: authorizationData.authorization.id
              }),
            });

            if (!storageResponse.ok) {
              const storageError = await storageResponse.json();
              console.error('Storage creation failed:', storageError);
              setError(storageError.error || "Failed to create storage");
              setDeploymentStep(DeploymentStep.IDLE);
              return;
            }

            const storageData = await storageResponse.json();
            console.log('Storage created:', storageData);

            // Connect the storage to the project
            setDeploymentStep(DeploymentStep.CONNECTING_STORAGE);
            try {
              const connectionResponse = await fetch("/api/connect-storage-to-project", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  storeId: storageData.storage.store.id,
                  projectId: projectData.id
                }),
              });

              if (!connectionResponse.ok) {
                const connectionError = await connectionResponse.json();
                console.error('Connection failed:', connectionError);
                setError(connectionError.error || "Failed to connect storage to project");
                setDeploymentStep(DeploymentStep.IDLE);
                return;
              }

              const connectionData = await connectionResponse.json();
              console.log('Storage connected to project:', connectionData);
            } catch (connectionError) {
              console.error('Connection error:', connectionError);
              setError("Failed to connect storage to project");
              setDeploymentStep(DeploymentStep.IDLE);
              return;
            }
          } catch (storageError) {
            console.error('Storage creation error:', storageError);
            setError("Failed to create storage");
            setDeploymentStep(DeploymentStep.IDLE);
            return;
          }
        } catch (authError) {
          console.error('Authorization creation error:', authError);
          setError("Failed to create authorization");
          setDeploymentStep(DeploymentStep.IDLE);
          return;
        }
      }

      // Then deploy to the created project
      console.log(`🚀 Starting deployment to project: ${projectData.name}`);
      setDeploymentStep(DeploymentStep.DEPLOYING);
      const response = await fetch(`/api/deploy?projectName=${projectData.name}`, {
        method: "POST",
        body: formData,
      });

      console.log(`📡 Deploy API Response: ${response.status} ${response.statusText}`);

      if (response.status === 429) {
        console.error("❌ Rate limit exceeded");
        setError("You've reached the limit. Please try again later.");
        return;
      }

      const data = await response.json();

      if (response.ok) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        setDeployment(data.deployment);

        try {
          const response = await fetch(
            `/api/wait-for-deploy/${data.deployment.url}`,
            {
              signal: controller.signal,
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (error) {
          if ((error as Error).name === "AbortError") {
            const response = await fetch(
              `/api/cancel-deployment/${data.deployment.url}`,
              {
                method: "PATCH",
              }
            );

            if (!response.ok) {
              setError("Failed to cancel deployment.");
              return;
            }

            setError("Deployment cancelled due to timeout.");
            return;
          }
        } finally {
          clearTimeout(timeoutId);
        }

        const res = await fetch("/api/start-project-transfer", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            projectId: data.deployment.projectId,
          }),
        });

        setDeploymentStep(DeploymentStep.FINISHED);

        if (!res.ok) {
          const errorData = await res.json();
          console.error('Project transfer failed:', res.status, errorData);
          setError(`Failed to start project transfer: ${res.status}`);
          return;
        }

        const dataProjectTransfer = await res.json();
        console.log('Project transfer response:', dataProjectTransfer);

        if (!dataProjectTransfer.code) {
          console.error('No code received from project transfer:', dataProjectTransfer);
          setError("Failed to get transfer code");
          return;
        }

        // Use the public project URL for iframe mode, deployment URL for screenshots
        const publicUrl = `https://${projectData.name}.vercel.app`;
        const deploymentUrl = `https://${data.deployment.alias[0]}`;
        const framework = selectedTemplate || 'nextjs';

        router.push(
          `/claim?code=${encodeURIComponent(dataProjectTransfer.code)}&previewUrl=${encodeURIComponent(publicUrl)}&deploymentUrl=${encodeURIComponent(deploymentUrl)}&framework=${encodeURIComponent(framework)}`
        );
      } else {
        setError(data.error || "Deployment failed");
      }
    } catch (error) {
      console.error("error", error);
      setError("An error occurred during deployment.");
      setDeploymentStep(DeploymentStep.IDLE);
    }
  };

  const templates = [
    {
      id: "nextjs_with_prisma",
      name: "Next.js + Prisma",
      icon: (
        <div className="flex items-center justify-center space-x-1 h-8">
          <Image
            src="images/nextjs.svg"
            width={32}
            height={32}
            alt="Next.js logo"
          />
          <span className="text-gray-600 text-lg font-bold flex items-center pl-1">+</span>
          <Image
            src="/images/prisma.svg"
            width={32}
            height={32}
            alt="Prisma logo"
          />
        </div>
      ),
      averageDeployTimeInSeconds: 50,
    },
    {
      id: "nextjs_with_prisma_and_better_auth",
      name: "Next.js + Prisma + Better-Auth",
      icon: (
        <div className="flex items-center justify-center space-x-1 h-8">
          <Image
            src="images/nextjs.svg"
            width={24}
            height={24}
            alt="Next.js logo"
          />
          <span className="text-gray-600 text-sm font-bold flex items-center px-0.5">+</span>
          <Image
            src="/images/prisma.svg"
            width={24}
            height={24}
            alt="Prisma logo"
          />
          <span className="text-gray-600 text-sm font-bold flex items-center px-0.5">+</span>
          <Image
            src="/images/better-auth.svg"
            width={24}
            height={24}
            alt="Better Auth logo"
          />
        </div>
      ),
      averageDeployTimeInSeconds: 60,
    },
  ];

  const deployButtonDisabled =
    deploymentStep !== DeploymentStep.IDLE || (!file && !selectedTemplate);

  return (
    <div className="min-h-[330px]">
      <style jsx>{`
        @keyframes border-pulse {
          0%, 100% {
            border-color: #3b82f6;
          }
          50% {
            border-color: #60a5fa;
          }
        }
      `}</style>
      <h2 className="text-2xl font-semibold text-neutral-800">
        Deploy to Vercel
      </h2>
      <p className="text-sm text-neutral-500 mt-2">
        Choose a template to deploy to Vercel with a ready-to-use <span className="text-blue-600"><a href="https://pris.ly/postgres?utm_source=claim_deployments_demo&utm_campaign=vercel_claim_partnership" rel="noopener noreferrer">Prisma Postgres</a></span> database, or upload your own project as a zip file.      </p>
      <div className="mt-6">
        <div className="w-full">
          <div className="flex rounded-md p-1 border border-neutral-200">
            <button
              type="button"
              onClick={() => setActiveTab("template")}
              className={`flex-1 text-sm py-2 ${activeTab === "template"
                ? "bg-neutral-100 text-neutral-900 font-medium"
                : "text-neutral-600"
                }`}
            >
              Choose Template
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex-1 text-sm py-2 ${activeTab === "upload"
                ? "bg-neutral-100 text-neutral-900 font-medium"
                : "text-neutral-600"
                }`}
            >
              Upload File
            </button>
          </div>
          <div className="mt-6">
            {activeTab === "template" && (
              <div className="flex flex-col md:flex-row gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`flex-1 cursor-pointer transition-all sm:p-6 p-2 pt-3 rounded-lg border relative ${selectedTemplate === template.id
                      ? "bg-blue-50 border-blue-500 border-2 shadow-md"
                      : "border-neutral-200 hover:border-neutral-300 hover:shadow-sm"
                      }`}
                    style={selectedTemplate === template.id ? {
                      animation: 'border-pulse 3s ease-in-out infinite'
                    } : {}}
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setFile(null);
                    }}
                  >
                    {selectedTemplate === template.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className="flex flex-col items-center justify-center">
                      {template.icon}
                      <h3 className="font-medium text-sm text-neutral-900 mt-2 whitespace-nowrap">
                        {template.name}
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {activeTab === "upload" && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-7 text-center cursor-pointer transition-colors ${isDragActive
                  ? "border-black bg-gray-50"
                  : "border-gray-300 hover:border-gray-400"
                  }`}
              >
                <input {...getInputProps()} />
                <Image
                  alt="Upload"
                  src="/icons/upload.svg"
                  className="mx-auto mb-2"
                  width={24}
                  height={24}
                />
                <p className="text-sm text-gray-500">
                  Drag & drop a .tgz file of a Next.js project here, or click to
                  select
                </p>
                {file && (
                  <p className="mt-2 text-sm font-medium text-gray-800">
                    Selected file: {file.name}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center bg-red-100 rounded-md p-2 mt-6 text-sm text-red-600">
              <Image
                src="/icons/error.svg"
                alt="Error icon"
                width={16}
                height={16}
                className="mr-2"
              />
              {error}
            </div>
          )}


          <div className="mt-6">
            <button
              type="submit"
              disabled={deployButtonDisabled}
              className={`w-full py-2 px-4 rounded-md font-medium text-sm ${deployButtonDisabled
                ? "bg-neutral-100 text-gray-400  cursor-not-allowed border"
                : "bg-black hover:opacity-80 text-white"
                }`}
              onClick={handleDeploy}
            >
              {deploymentStep === DeploymentStep.FINISHED ? (
                "Deployment successful"
              ) : deploymentStep !== DeploymentStep.IDLE ? (
                <LoadingSpinner text="Deploying..." />
              ) : (
                "Deploy"
              )}
            </button>
          </div>

          {deploymentStep !== DeploymentStep.IDLE && (
            <>
              <ProgressBar
                disabled={deploymentStep === DeploymentStep.FINISHED}
                totalTimeInSeconds={
                  templates.find((template) => template.id === selectedTemplate)
                    ?.averageDeployTimeInSeconds || 120
                }
              />
              <BuildLogs
                deployment={deployment}
                deploymentStep={deploymentStep}
              />
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
