import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT_DIRECTORY, "config", "TournamentConfig.json");
const WRANGLER_CONFIG_PATH = path.join(ROOT_DIRECTORY, "wrangler.toml");
const CONFIG_KEY = "TournamentConfig";
const EXPLORER_PATH = "/cdn-cgi/explorer/api";
const LOCAL_KV_BINDING = "lol-stats-kv";
const UNSUPPORTED_ARGUMENTS = new Set(["--config", "-c", "--cwd", "--env", "-e", "--local-protocol"]);

function resolveWranglerPath() {
  const require = createRequire(import.meta.url);
  const packagePath = require.resolve("wrangler/package.json");
  const packageDefinition = require(packagePath);
  const binPath = packageDefinition?.bin?.wrangler;
  if (typeof binPath !== "string" || binPath.length === 0) {
    throw new Error("Wrangler package does not declare a wrangler CLI binary");
  }
  return path.resolve(path.dirname(packagePath), binPath);
}

const WRANGLER_PATH = resolveWranglerPath();

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

async function readConfig() {
  const bytes = await readFile(CONFIG_PATH);
  requireObject(JSON.parse(bytes.toString("utf8")), "TournamentConfig");
  return bytes;
}

async function readDevPort(arguments_) {
  const inlinePort = arguments_.find((argument) => argument.startsWith("--port="));
  if (inlinePort) {
    return requirePort(inlinePort.slice("--port=".length));
  }
  const portIndex = arguments_.indexOf("--port");
  if (portIndex !== -1) {
    return requirePort(arguments_[portIndex + 1]);
  }

  const wranglerConfig = await readFile(WRANGLER_CONFIG_PATH, "utf8");
  const devHeader = /^\[dev\]\s*$/m.exec(wranglerConfig);
  if (!devHeader) {
    throw new Error("wrangler.toml [dev] section is required by the local development runner");
  }
  const remainingConfig = wranglerConfig.slice(devHeader.index + devHeader[0].length);
  const nextSectionIndex = remainingConfig.search(/^\[/m);
  const devSection = nextSectionIndex === -1
    ? remainingConfig
    : remainingConfig.slice(0, nextSectionIndex);
  const configuredPort = devSection && /^\s*port\s*=\s*(\d+)\s*(?:#.*)?$/m.exec(devSection)?.[1];
  if (!configuredPort) {
    throw new Error("wrangler.toml [dev].port is required by the local development runner");
  }
  return requirePort(configuredPort);
}

function assertLocalArguments(arguments_) {
  for (const argument of arguments_) {
    if (argument === "--remote" || argument === "-r" || argument.startsWith("--remote=")) {
      throw new Error("Local development runner does not allow remote mode");
    }
    const option = argument.split("=", 1)[0];
    if (UNSUPPORTED_ARGUMENTS.has(option)) {
      throw new Error(`Local development runner does not allow ${option}`);
    }
  }
}

function requirePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid development port: ${value}`);
  }
  return port;
}

function explorerUrl(port, pathname) {
  return new URL(`${EXPLORER_PATH}${pathname}`, `http://127.0.0.1:${port}`);
}

async function readJson(response, label) {
  if (!response.ok) {
    throw new Error(`${label} failed: HTTP ${response.status} ${await response.text()}`);
  }
  return requireObject(await response.json(), label);
}

async function readKvNamespace(port) {
  const response = await fetch(explorerUrl(port, "/storage/kv/namespaces"));
  const payload = await readJson(response, "Local KV namespace lookup");
  if (payload.success !== true || !Array.isArray(payload.result)) {
    throw new Error("Local KV namespace lookup returned an invalid response");
  }
  const matchingNamespaces = payload.result.filter((namespace) => (
    namespace
    && typeof namespace === "object"
    && !Array.isArray(namespace)
    && namespace.title === LOCAL_KV_BINDING
  ));
  if (matchingNamespaces.length !== 1) {
    throw new Error(`Expected one local KV binding named ${LOCAL_KV_BINDING}, received ${matchingNamespaces.length}`);
  }
  const namespace = requireObject(matchingNamespaces[0], "Local KV namespace");
  if (typeof namespace.id !== "string" || namespace.id.length === 0) {
    throw new Error("Local KV namespace id is missing");
  }
  if (typeof namespace.title !== "string" || namespace.title.length === 0) {
    throw new Error("Local KV namespace title is missing");
  }
  return namespace;
}

async function writeConfig(port, namespaceId, configBytes) {
  const pathname = `/storage/kv/namespaces/${encodeURIComponent(namespaceId)}/values/${encodeURIComponent(CONFIG_KEY)}`;
  const url = explorerUrl(port, pathname);
  const writeResponse = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: configBytes,
  });
  const writePayload = await readJson(writeResponse, "TournamentConfig write");
  if (writePayload.success !== true) {
    throw new Error("TournamentConfig write was rejected");
  }

  const readResponse = await fetch(url);
  if (!readResponse.ok) {
    throw new Error(`TournamentConfig verification failed: HTTP ${readResponse.status}`);
  }
  const storedBytes = Buffer.from(await readResponse.arrayBuffer());
  if (!storedBytes.equals(configBytes)) {
    throw new Error("TournamentConfig verification returned different content");
  }
}

async function seedConfig(port, configBytes) {
  const namespace = await readKvNamespace(port);
  await writeConfig(port, namespace.id, configBytes);
  process.stdout.write(`\nLocal KV ready: ${CONFIG_KEY} → ${namespace.title}\n`);
}

async function requireAvailablePort(port) {
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      reject(new Error(`Development port ${port} is already in use`));
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error(`Timed out while checking development port ${port}`));
    });
    socket.once("error", (error) => {
      socket.destroy();
      if (error.code === "ECONNREFUSED") {
        resolve();
      } else {
        reject(error);
      }
    });
  });
}

async function waitForExplorer(port, wrangler, readSpawnError) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const spawnError = readSpawnError();
    if (spawnError) throw spawnError;
    if (wrangler.exitCode !== null || wrangler.signalCode !== null) {
      throw new Error(`Wrangler exited before Local Explorer was ready (code ${wrangler.exitCode})`);
    }
    try {
      const response = await fetch(explorerUrl(port, ""), {
        signal: globalThis.AbortSignal.timeout(500),
      });
      if (response.ok) return;
    } catch {
      // The local socket is expected to reject requests while workerd is starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Local Explorer did not become ready within 30 seconds");
}

async function run() {
  const arguments_ = process.argv.slice(2);
  assertLocalArguments(arguments_);
  const configBytes = await readConfig();
  const port = await readDevPort(arguments_);
  await requireAvailablePort(port);

  const wrangler = spawn(process.execPath, [WRANGLER_PATH, "dev", "--local", ...arguments_], {
    cwd: ROOT_DIRECTORY,
    env: process.env,
    stdio: "inherit",
  });

  let initializationFailed = false;
  let spawnError;
  const exit = new Promise((resolve) => {
    wrangler.once("error", (error) => {
      spawnError = error;
      resolve({ error });
    });
    wrangler.once("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });

  try {
    await waitForExplorer(port, wrangler, () => spawnError);
    await seedConfig(port, configBytes);
  } catch (error) {
    initializationFailed = true;
    process.stderr.write(`\nLocal KV initialization failed: ${error.message}\n`);
    wrangler.kill("SIGTERM");
  }

  const result = await exit;
  process.exitCode = initializationFailed || result.error
    ? 1
    : result.signal
      ? 0
      : result.code ?? 1;
}

run().catch((error) => {
  process.stderr.write(`Local development failed: ${error.message}\n`);
  process.exitCode = 1;
});
