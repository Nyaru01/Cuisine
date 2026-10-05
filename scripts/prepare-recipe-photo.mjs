import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const [source, id] = process.argv.slice(2);
if (!source || !/^[a-z0-9-]+$/.test(id ?? "")) throw new Error("Source and recipe ID required");
await mkdir(resolve("public/images/recipes"), { recursive: true });
await sharp(source).resize(960, 640, { fit: "cover" }).webp({ quality: 78 }).toFile(resolve(`public/images/recipes/${id}.webp`));
console.log(`Prepared ${id}`);
