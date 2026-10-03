import { readFile, writeFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const path = process.argv.includes("--docker") ? ".env" : ".env.local";
try {
  await access(path);
  console.log(`${path} already exists.`);
} catch {
  const template = await readFile(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );
  await writeFile(
    path,
    template.replace(
      "replace-with-a-random-secret-at-least-32-characters",
      randomBytes(32).toString("hex"),
    ),
    { mode: 0o600 },
  );
  console.log(`${path} created.`);
}
