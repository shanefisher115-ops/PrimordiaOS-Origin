import { createRequire } from "module";
const require = createRequire(import.meta.url);

try {
  require("./primordia/cli/cinema.ts");
} catch (err) {
  console.error("CYCLE TRACE:");
  console.error(err);
}
