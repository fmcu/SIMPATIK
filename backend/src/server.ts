import { app } from "./app.js";
import { environment } from "./config/environment.js";
import { prisma } from "./config/prisma.js";

const server = app.listen(environment.PORT, () => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "server_started",
      port: environment.PORT,
      environment: environment.NODE_ENV,
    }),
  );
});

function shutdown(signal: string): void {
  server.close(() => {
    void prisma.$disconnect().finally(() => {
      process.exit(0);
    });
  });

  setTimeout(() => {
    process.exit(1);
  }, 10_000).unref();

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "server_shutdown",
      signal,
    }),
  );
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
