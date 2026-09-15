// @ts-check
import { failFast, listen } from "@dwtechs/servpico-express";
import app from "./app.js";
import { startDeleteArchivedEntitiesJob } from "./jobs/delete-archived-entities.js";
import { startDeleteOldHistoryJob } from "./jobs/delete-old-history.js";

// Anything that escapes Express's error pipeline would otherwise die with no
// structured log and no orderly shutdown.
process.on("unhandledRejection", (reason) => {
  failFast(reason instanceof Error ? reason : new Error(String(reason)));
});
process.on("uncaughtException", (err) => {
  failFast(err);
});

Promise.resolve()
  .then(() => {
    startDeleteArchivedEntitiesJob();
    startDeleteOldHistoryJob();
    listen(app);
  })
  .catch(failFast);
