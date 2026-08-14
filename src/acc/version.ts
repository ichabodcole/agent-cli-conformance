import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Read from package.json rather than duplicated here — one source of truth for the version. */
const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../package.json");
export const VERSION = (JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string }).version;
