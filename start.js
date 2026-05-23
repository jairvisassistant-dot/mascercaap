const { execSync } = require("child_process");
const fs = require("fs");

const cmd = fs.existsSync("admin-app/.next")
  ? "npm --prefix admin-app run start"
  : "npx next start";

execSync(cmd, { stdio: "inherit" });
