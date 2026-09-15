// @ts-check

import { execute } from "@dwtechs/antity-pgsql";
import { errorHandler } from "@dwtechs/errandler-express";
import { healix } from "@dwtechs/healix-express";
import { startTimer } from "@dwtechs/winstan-plugin-express-perf";
import express from "express";

const app = express();
app.disable("x-powered-by");

import { civility, country, gender } from "./entities/lookups.js";
import preferenceEnt from "./entities/preference.js";
import socialEnt from "./entities/social.js";
import userEnt from "./entities/user.js";
import { send } from "./middlewares/res/send.js";
import { lookupRouter } from "./routes/lookup.js";
import preference from "./routes/preference.js";
import social from "./routes/social.js";
import user from "./routes/user.js";

app.use(express.json({ limit: "100kb" }));
const health = healix({ checks: { db: () => execute("SELECT 1", [], null) } });
app.use("/megadex/health", health);
app.use("/users/health", health);
app.use(startTimer);

for (const prefix of ["/megadex", "/users"]) {
  app.use(`${prefix}/users`, user, send(userEnt));
  app.use(`${prefix}/preferences`, preference, send(preferenceEnt));
  app.use(`${prefix}/socials`, social, send(socialEnt));
  app.use(`${prefix}/countries`, lookupRouter(country), send(country));
  app.use(`${prefix}/civilities`, lookupRouter(civility), send(civility));
  app.use(`${prefix}/genders`, lookupRouter(gender), send(gender));
}

errorHandler(app);

export default app;
