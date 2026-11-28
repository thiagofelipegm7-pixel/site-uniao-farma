import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("../", import.meta.url));
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));

const servidor = spawn(process.execPath, [vite, "--mode", "crm-local", "--host", "localhost", "--port", "4177", "--strictPort"], {
  cwd: raiz,
  stdio: "inherit",
  env: {
    ...process.env,
    CLOUDFLARE_VITE_FORCE_LOCAL: "true",
    CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
    CRM_WHATSAPP_DEMO: "on",
    CRM_WHATSAPP_ENABLED: "off",
    STAFF_USER: "demo",
    STAFF_PASSWORD: "uniao-demo-local",
    STAFF_SECRET: randomUUID(),
  },
});

servidor.on("error", (erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
servidor.on("exit", (codigo) => {
  process.exitCode = codigo ?? 0;
});
