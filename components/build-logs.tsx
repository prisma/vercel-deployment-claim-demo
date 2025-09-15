import { useBuildLogs } from "@/lib/use-build-logs";
import type { Deployment } from "@/lib/use-build-logs/types";
import { motion, AnimatePresence } from "framer-motion";
import { DeploymentStep } from "@/types/deployment";

export function BuildLogs({ 
  deployment, 
  deploymentStep
}: { 
  deployment: Deployment | null; 
  deploymentStep: DeploymentStep;
}) {
  const { steps: buildLogSteps } = useBuildLogs(deployment);

  const latestLog = buildLogSteps[0]?.logs
    .filter((log) => log.text !== "")
    .at(-1) || { text: "Deployment started ...", id: "first" };

  const getDisplayLog = () => {
    switch (deploymentStep) {
      case DeploymentStep.CREATING_PROJECT:
        return { text: "Creating project ...", id: "creating-project" };
      case DeploymentStep.CREATING_AUTHORIZATION:
        return { text: "Creating authorization ...", id: "creating-authorization" };
      case DeploymentStep.CREATING_STORAGE:
        return { text: "Creating storage ...", id: "creating-storage" };
      case DeploymentStep.CONNECTING_STORAGE:
        return { text: "Connecting storage to project ...", id: "connecting-storage" };
      case DeploymentStep.DEPLOYING:
        return latestLog;
      case DeploymentStep.FINISHED:
        return { text: "Deployment completed successfully!", id: "finished" };
      default:
        return latestLog;
    }
  };

  const displayLog = getDisplayLog();

  return (
    <AnimatePresence mode="popLayout">
      {displayLog && (
        <motion.div
          key={displayLog.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="mt-3 text-gray-600 p-3 rounded-md border border-gray-200 font-mono text-sm break-words"
        >
          {displayLog.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
