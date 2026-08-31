// @ts-check

import { execute } from "@dwtechs/antity-pgsql";
import { log } from "@dwtechs/winstan";
import { scheduleDailyAt } from "./scheduler.js";

const ARCHIVE_RETENTION_MONTHS = 2;

/**
 * Cron job to delete archived entities from the database.
 * All entities must be archived for at least ARCHIVE_RETENTION_MONTHS before deletion.
 * Runs once daily at 2:00 AM.
 *
 * Deletes archived user profiles, preferences, and social catalog entries.
 *
 * Cron schedule format: "second minute hour day month weekday"
 * Current schedule: "0 0 2 * * *" means every day at 2:00 AM
 *
 * @example
 * // Start the cron job
 * startDeleteArchivedEntitiesJob();
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

      const entities = ['"user"', "preference", "social"];
      const purge = async (table) => {
        const result = await execute(
          `DELETE FROM ${table} WHERE archived = true AND "archivedAt" < $1`,
          [cutoff],
          null,
        );
        return { entity: table, count: result.rowCount ?? 0 };
      };

      let totalDeleted = 0;

      const results = await Promise.allSettled(entities.map(purge));

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { entity, count } = result.value;
          if (count > 0) log.info(`    ✓ Deleted ${count} archived ${entity}`);
          else log.info(`    • No archived ${entity} to delete`);
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
