import { execSync } from "node:child_process";

const dir = "c:/Users/Shane/Documents/dev/PrimordiaOS/frontend";

console.log("=== Current Remotes in frontend ===");
try {
  console.log(execSync(`git -C "${dir}" remote -v`, { encoding: "utf8" }));
} catch (e) {
  console.error(e.message);
}

// 1. Rename existing origin to upstream (or set url)
try {
  const remotes = execSync(`git -C "${dir}" remote`, { encoding: "utf8" }).split("\n").map(s => s.trim()).filter(Boolean);
  
  if (remotes.includes("origin")) {
    if (!remotes.includes("upstream")) {
      execSync(`git -C "${dir}" remote rename origin upstream`, { stdio: "inherit" });
      console.log("Renamed 'origin' to 'upstream'");
    } else {
      execSync(`git -C "${dir}" remote remove origin`, { stdio: "inherit" });
    }
  }

  execSync(`git -C "${dir}" remote add origin https://github.com/shanefisher115-ops/frontend.git`, { stdio: "inherit" });
  console.log("Added origin pointing to https://github.com/shanefisher115-ops/frontend.git");

  console.log("\nFetching from origin...");
  execSync(`git -C "${dir}" fetch origin`, { stdio: "inherit" });

  console.log("\nSetting upstream tracking for main -> origin/main...");
  try {
    execSync(`git -C "${dir}" branch --set-upstream-to=origin/main main`, { stdio: "inherit" });
  } catch (err) {
    console.log("Could not set upstream directly, checking branches...");
  }

  console.log("\n=== Updated Remotes ===");
  console.log(execSync(`git -C "${dir}" remote -v`, { encoding: "utf8" }));

  console.log("\n=== Status ===");
  console.log(execSync(`git -C "${dir}" status`, { encoding: "utf8" }));

} catch (err) {
  console.error("Error updating remotes:", err.message);
}
