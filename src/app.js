// @ts-check

import { execute } from "@dwtechs/antity-pgsql";
import { errorHandler } from "@dwtechs/errandler-express";
import { healix } from "@dwtechs/healix-express";
import { startTimer } from "@dwtechs/winstan-plugin-express-perf";
import express from "express";

const app = express();
app.disable("x-powered-by");

import auditEnt from "./entities/audit.js";
import { civility, country, gender } from "./entities/lookups.js";
import preferenceEnt from "./entities/preference.js";
import socialEnt from "./entities/social.js";
import userEnt from "./entities/user.js";
import { mapDbError } from "./middlewares/res/db-error.js";
import { send } from "./middlewares/res/send.js";
import audit from "./routes/audit.js";
import { lookupRouter } from "./routes/lookup.js";
import preference from "./routes/preference.js";
import social from "./routes/social.js";
import user from "./routes/user.js";

app.use(express.json({ limit: "100kb" }));
const health = healix({ checks: { db: () => execute("SELECT 1", [], null) } });
app.use("/megadex/health", health);
app.use(startTimer);

app.use("/megadex/audit", audit, send(auditEnt));
app.use("/megadex/users", user, send(userEnt));
app.use("/megadex/preferences", preference, send(preferenceEnt));
app.use("/megadex/socials", social, send(socialEnt));
app.use("/megadex/countries", lookupRouter(country), send(country));
app.use("/megadex/civilities", lookupRouter(civility), send(civility));
app.use("/megadex/genders", lookupRouter(gender), send(gender));

app.use(mapDbError);
errorHandler(app);

export default app;
