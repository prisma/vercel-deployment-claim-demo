import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function ProgressBar({
  totalTimeInSeconds,
  disabled = false,
  isComplete = false,
}: {
  totalTimeInSeconds: number;
  disabled?: boolean;
  isComplete?: boolean;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        // If complete, jump to 100%
        if (isComplete) {
          clearInterval(interval);
          return 100;
        }

        // Normal progress until 85%
        if (prevProgress < 85) {
          return prevProgress + 100 / (totalTimeInSeconds * 10);
        }

        // After 85%, crawl slowly
        return Math.min(95, prevProgress + 0.05);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [totalTimeInSeconds, isComplete]);

  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-5">
      <motion.div
        className={`h-full bg-black ${disabled ? "opacity-20" : ""}`}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{
          type: "spring",
          stiffness: 20,
          damping: 20,
        }}
      />
    </div>
  );
}
