import { execSync } from "node:child_process";

const paths = [
  "c:/Users/Shane/Documents/dev/PrimordiaOS/frontend",
  "c:/Users/Shane/PrimordiaOS",
  "c:/Users/Shane/Documents/dev/PrimordiaOS/PlugIn-OS",
  "c:/Users/Shane/Documents/dev/PrimordiaOS/PrimordiaOS/frontend"
];

for (const p of paths) {
  console.log(`=== Checking: ${p} ===`);
  try {
    const remotes = execSync(`git -C "${p}" remote -v`, { encoding: "utf8" });
    console.log(remotes);
    const branch = execSync(`git -C "${p}" branch -vv`, { encoding: "utf8" });
    console.log(branch);
  } catch (e) {
    console.log(`Error/Not a git repo: ${e.message}`);
  }
}
