// Regenerate public/guide-stockkonect.pdf through the ReportLab builder.
// Requires Python 3 with reportlab installed; set PYTHON to override the interpreter.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const script = join(dirname(fileURLToPath(import.meta.url)), "generate-guide.py");
const result = spawnSync(process.env.PYTHON || "python", [script], { stdio: "inherit" });

if (result.error) {
  console.error(`Unable to run Python: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
