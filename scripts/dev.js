import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(label, cwd, command, args) {
  const child = spawn(command, args, {
    cwd,
    stdio: "pipe",
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  child.stdout.on("data", (data) => {
    for (const line of data.toString().split("\n").filter(Boolean)) {
      console.log(`[${label}] ${line}`);
    }
  });

  child.stderr.on("data", (data) => {
    for (const line of data.toString().split("\n").filter(Boolean)) {
      console.error(`[${label}] ${line}`);
    }
  });

  child.on("close", (code) => {
    console.log(`[${label}] exited with code ${code}`);
  });

  return child;
}

console.log("Starting Dental Platform...\n");

const backend = run("backend", resolve(root, "backend"), "npm", ["run", "dev"]);
const frontend = run("frontend", resolve(root, "frontend"), "npm", ["run", "dev"]);

process.on("SIGINT", () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});
