import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface CliOptions {
  provider?: string;
  model?: string;
  system?: string;
  baseUrl?: string;
  config?: string;
  log?: string;
}

export interface ResolvedConfig {
  provider: string;
  model: string;
  system?: string;
  baseUrl?: string;
  apiKey?: string;
  log?: string;
}

interface ProviderDefaults {
  baseUrl: string;
  model: string;
  apiKeyEnv?: string;
}

const PROVIDER_DEFAULTS: Record<string, ProviderDefaults> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKeyEnv: "OPENAI_API_KEY",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-5-haiku-latest",
    apiKeyEnv: "ANTHROPIC_API_KEY",
  },
  ollama: {
    baseUrl: "http://localhost:11434",
    model: "llama3.2",
  },
};

export function defaultConfigPaths(): string[] {
  return [
    join(process.cwd(), "agysyy.toml"),
    join(process.cwd(), "agysyy.json"),
    join(homedir(), ".config", "agysyy", "config.toml"),
    join(homedir(), ".config", "agysyy", "config.json"),
  ];
}

function parseTomlFlat(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line || line.startsWith("[")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

function readConfigFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, "utf8");
  try {
    if (path.endsWith(".json")) {
      return JSON.parse(text) as Record<string, string>;
    }
    return parseTomlFlat(text);
  } catch {
    return {};
  }
}

const first = (...values: Array<string | undefined>): string | undefined =>
  values.find((value) => value !== undefined && value !== "");

function pick(file: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (file[key]) return file[key];
  }
  return undefined;
}

export function resolveConfig(
  options: CliOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): ResolvedConfig {
  let file: Record<string, string> = {};
  const paths = options.config ? [options.config] : defaultConfigPaths();
  for (const path of paths) {
    const loaded = readConfigFile(path);
    if (Object.keys(loaded).length > 0) {
      file = loaded;
      break;
    }
  }

  const provider =
    first(
      options.provider,
      env.AGYSYY_PROVIDER,
      pick(file, "provider"),
    ) ??
    (env.OPENAI_API_KEY ? "openai" : env.ANTHROPIC_API_KEY ? "anthropic" : "ollama");

  const defaults = PROVIDER_DEFAULTS[provider];

  const providerEnvModel =
    provider === "openai"
      ? env.OPENAI_MODEL
      : provider === "anthropic"
        ? env.ANTHROPIC_MODEL
        : provider === "ollama"
          ? env.OLLAMA_MODEL
          : undefined;

  const model =
    first(
      options.model,
      env.AGYSYY_MODEL,
      providerEnvModel,
      pick(file, "model"),
      defaults?.model,
    ) ?? "llama3.2";

  const providerEnvBaseUrl =
    provider === "openai"
      ? env.OPENAI_BASE_URL
      : provider === "anthropic"
        ? env.ANTHROPIC_BASE_URL
        : provider === "ollama"
          ? env.OLLAMA_HOST
          : undefined;

  const baseUrl = first(
    options.baseUrl,
    env.AGYSYY_BASE_URL,
    providerEnvBaseUrl,
    pick(file, "base_url", "baseUrl"),
    defaults?.baseUrl,
  );

  const apiKey = first(
    defaults?.apiKeyEnv ? env[defaults.apiKeyEnv] : undefined,
    pick(file, "api_key", "apiKey"),
  );

  const system = first(options.system, env.AGYSYY_SYSTEM, pick(file, "system"));

  const log = first(options.log, env.AGYSYY_LOG, pick(file, "log"));

  return { provider, model, system, baseUrl, apiKey, log };
}
