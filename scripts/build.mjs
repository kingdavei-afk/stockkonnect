import { spawnSync } from "node:child_process";
import { join } from "node:path";

function runLocalBinary(name, args) {
  const executable = join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? `${name}.cmd` : name
  );
  const result = spawnSync(executable, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Apply production schema updates before Next.js builds code that depends on them.
if (process.env.VERCEL_ENV === "production") {
  runLocalBinary("prisma", ["migrate", "deploy"]);
}

runLocalBinary("next", ["build", "--turbopack"]);
