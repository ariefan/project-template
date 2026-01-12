"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { format } from "date-fns";

interface AppVersionProps {
  version?: string;
  buildCommit?: string;
  buildTime?: string;
}

export function AppVersion({
  version: propVersion,
  buildCommit: propCommit,
  buildTime: propTime,
}: AppVersionProps = {}) {
  const version = propVersion || process.env.APP_VERSION;
  const buildCommit = propCommit || process.env.BUILD_COMMIT;
  const buildTime = propTime || process.env.BUILD_TIME;

  if (!(version || buildCommit)) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground text-xs group-data-[collapsible=icon]:hidden">
      <div className="flex items-center gap-1">
        <span>v{version}</span>
        {buildCommit && (
          <>
            <span>•</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help font-mono">{buildCommit}</span>
                </TooltipTrigger>
                {buildTime && (
                  <TooltipContent>
                    <p>
                      Updated on {format(new Date(buildTime), "PPP 'at' p")}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    </div>
  );
}
