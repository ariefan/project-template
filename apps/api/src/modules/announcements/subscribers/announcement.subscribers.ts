import { JobType } from "@workspace/contracts/jobs";
import type { AnnouncementRow } from "@workspace/db/schema";
import { Events, eventBus } from "../../../lib/events";
import { jobsService } from "../../jobs";

/**
 * Initialize announcement event subscribers
 */
export function initAnnouncementSubscribers(): void {
  // Listen for new announcements
  eventBus.onEvent(Events.ANN_CREATED, (payload: unknown) => {
    const announcement = payload as AnnouncementRow;
    console.log(
      `[Subscriber] New announcement created: ${announcement.id}. Triggering automation...`
    );

    // Fire and forget the job creation
    (async () => {
      try {
        // Automatically enqueue a job to process this announcement
        await jobsService.createJob({
          orgId: announcement.orgId ?? "system",
          type: JobType.ANNOUNCEMENT_PROCESS,
          createdBy: announcement.createdBy,
          input: {
            announcementId: announcement.id,
            action: "notify",
          },
          metadata: {
            announcementId: announcement.id,
          } as Record<string, unknown>,
        });
      } catch (error) {
        console.error(
          `[Subscriber] Failed to trigger job for announcement ${announcement.id}:`,
          error
        );
      }
    })();
  });

  console.log("Announcement subscribers initialized");
}
