import "dotenv/config";
import { createApp } from "./app.js";
import { db } from "./db.js";
const port = Number(process.env.PORT || 3001);
const server = createApp().listen(
  port,
  process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
  () => console.log(`À Table ! écoute sur le port ${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(() => {
      void db.$disconnect().then(() => process.exit(0));
    });
  });
