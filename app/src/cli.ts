import { parseArgs } from "node:util";
import pkg from "../package.json" with { type: "json" };
import { resolveConfig } from "./config.js";
import { DatasetLogger } from "./logger.js";
import { createProvider } from "./providers/index.js";
import type { Message } from "./providers/types.js";
import { ProviderError } from "./providers/types.js";
import { startRepl } from "./repl.js";

export const version: string = pkg.version;

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const red = (text: string) => (useColor ? `\u001b[31m${text}\u001b[0m` : text);

const HELP = `AgyssyyGPT - an AI chat that lives in your terminal.

Usage:
  agys [options] [prompt]

Options:
  -p, --provider <name>   openai | anthropic | ollama
  -m, --model <name>      Model name (provider specific)
  -s, --system <text>     System prompt
      --base-url <url>    Override the provider endpoint
  -c, --config <path>     Path to an agysyy.toml / agysyy.json config
      --log <path>        Append completed chats to a JSONL dataset file
  -h, --help              Show this help
  -v, --version           Show version

Examples:
  agys                         Start an interactive chat
  agys "explain monads"        One-shot prompt
  agys -p ollama -m llama3.2   Chat with a local model

Config is resolved from CLI flags, then environment variables, then
./agysyy.toml, then ~/.config/agysyy/config.toml.`;

function fail(message: string): void {
  process.stderr.write(red("error: ") + message + "\n");
  process.exitCode = 1;
}

export async function run(argv: string[] = process.argv.slice(2)): Promise<void> {
  let values: Record<string, unknown>;
  let positionals: string[];

  try {
    const parsed = parseArgs({
      args: argv,
      options: {
        provider: { type: "string", short: "p" },
        model: { type: "string", short: "m" },
        system: { type: "string", short: "s" },
        "base-url": { type: "string" },
        config: { type: "string", short: "c" },
        log: { type: "string" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
      allowPositionals: true,
      strict: true,
    });
    values = parsed.values as Record<string, unknown>;
    positionals = parsed.positionals;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }

  if (values.help) {
    process.stdout.write(HELP + "\n");
    return;
  }
  if (values.version) {
    process.stdout.write(version + "\n");
    return;
  }

  const config = resolveConfig({
    provider: values.provider as string | undefined,
    model: values.model as string | undefined,
    system: values.system as string | undefined,
    baseUrl: values["base-url"] as string | undefined,
    config: values.config as string | undefined,
    log: values.log as string | undefined,
  });

  let provider;
  try {
    provider = createProvider({
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });
  } catch (error) {
    fail(error instanceof ProviderError || error instanceof Error ? error.message : String(error));
    return;
  }

  const logger = config.log ? new DatasetLogger(config.log) : undefined;

  if (positionals.length > 0) {
    const messages: Message[] = [];
    if (config.system) messages.push({ role: "system", content: config.system });
    messages.push({ role: "user", content: positionals.join(" ") });
    try {
      const reply = await provider.chat(messages);
      messages.push({ role: "assistant", content: reply });
      logger?.append(messages, { version, provider: provider.name, model: provider.model });
      process.stdout.write(reply + "\n");
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
    return;
  }

  await startRepl(provider, { system: config.system, version, logger });
}
