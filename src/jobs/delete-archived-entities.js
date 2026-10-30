// @ts-check

import { log } from "@dwtechs/winstan";
import { makeDeleteArchived } from "../utils/delete-archived.js";
import { scheduleDailyAt } from "./scheduler.js";

const ARCHIVE_RETENTION_MONTHS = 2;

/**
 * Cron job to delete archived entities from the database.
 * All entities must be archived for at least ARCHIVE_RETENTION_MONTHS before deletion.
 * Runs once daily at 2:00 AM UTC as the job DB role via `delete()`.
 *
 * Deletes archived user profiles and social catalog entries. Preference rows
 * have no archive columns and are removed by the HTTP API, not this job.
 */
export function startDeleteArchivedEntitiesJob() {
  scheduleDailyAt(
    2,
    async () => {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - ARCHIVE_RETENTION_MONTHS);

      log.info(
        `Starting scheduled deletion of archived entities (archived > ${ARCHIVE_RETENTION_MONTHS} months)...`,
      );

      const entities = [
        { name: "users", deleteArchived: makeDeleteArchived("user") },
        { name: "socials", deleteArchived: makeDeleteArchived("social") },
      ];

      let totalDeleted = 0;

      const results = await Promise.allSettled(
        entities.map((entity) =>
          entity.deleteArchived(cutoff).then((count) => ({ entity, count })),
        ),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { entity, count } = result.value;
          if (count > 0)
            log.info(`    ✓ Deleted ${count} archived ${entity.name}`);
          else log.info(`    • No archived ${entity.name} to delete`);
          totalDeleted += count;
        } else {
          log.error(
            `    ✗ Failed: ${result.reason?.message || result.reason?.msg}`,
          );
        }
      }

      log.info(
        `Completed deletion of archived entities. Total deleted: ${totalDeleted}`,
      );
    },
    "delete-archived-entities",
  );

  log.info(
    `Delete archived entities job initialized (runs daily at 2:00 AM UTC, deletes entities archived > ${ARCHIVE_RETENTION_MONTHS} months)`,
  );
}
