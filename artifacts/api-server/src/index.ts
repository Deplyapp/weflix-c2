import app from "./app";
import { logger } from "./lib/logger";
import { probeDirectAccess, getBffAuthToken } from "./scrapers/moviebox-bff";


const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  fetch("https://ipinfo.io/json")
    .then((r) => {
      if (!r.ok) throw new Error(`ipinfo returned ${r.status}`);
      return r.json();
    })
    .then((data: Record<string, unknown>) => {
      logger.info(
        {
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country,
          org: data.org,
          timezone: data.timezone,
        },
        "Server datacenter info",
      );
    })
    .catch((err) => {
      logger.warn({ err: String(err) }, "Could not fetch datacenter IP info");
    });

  const streamProxy = process.env.STREAM_PROXY_URL || process.env.CF_STREAM_PROXY_URL || "";
  if (streamProxy) {
    logger.info({ streamProxy }, "Stream proxy: using external CF Worker");
  } else {
    logger.info("Stream proxy: using server's own /api/stream/proxy (no STREAM_PROXY_URL set)");
  }

  probeDirectAccess()
    .then(() => getBffAuthToken())
    .then((token) => {
      if (token) logger.info("Auth token pre-warmed at startup");
      else logger.warn("Auth token pre-warm failed — will retry on first request");
    })
    .catch(() => {});
});
