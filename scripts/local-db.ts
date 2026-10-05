import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs/promises";
import path from "node:path";
const data = path.resolve(".local/postgres");
await fs.mkdir(".local", { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir: data,
  user: "cuisine",
  password: "cuisine",
  port: 55432,
  persistent: true,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: (message) => console.error(String(message)),
});
try {
  await fs.access(path.join(data, "PG_VERSION"));
} catch {
  await pg.initialise();
}
await pg.start();
const client = pg.getPgClient();
await client.connect();
const result = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = 'cuisine'",
);
if (!result.rowCount) await pg.createDatabase("cuisine");
await client.end();
console.log(
  "PostgreSQL local prêt : 127.0.0.1:55432 / cuisine (Ctrl+C pour arrêter).",
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    void pg.stop().then(() => process.exit(0));
  });
setInterval(() => {}, 60000);
