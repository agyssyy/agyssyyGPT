import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import type { DatasetLogger } from "./logger.js";
import type { Message, Provider } from "./providers/types.js";
import { ProviderError } from "./providers/types.js";

const useColor = Boolean(output.isTTY) && !process.env.NO_COLOR;
const paint = (code: number, text: string): string =>
  useColor ? `\u001b[${code}m${text}\u001b[0m` : text;

const dim = (text: string) => paint(2, text);
const cyan = (text: string) => paint(36, text);
const green = (text: string) => paint(32, text);
const red = (text: string) => paint(31, text);
const bold = (text: string) => paint(1, text);

const HELP = `Commands:
  /help          Show this help
  /clear         Clear the conversation history
  /exit, /quit   Leave AgyssyyGPT`;

export interface ReplOptions {
  system?: string;
  version: string;
  logger?: DatasetLogger;
}

export async function startRepl(provider: Provider, options: ReplOptions): Promise<void> {
  const messages: Message[] = [];
  if (options.system) messages.push({ role: "system", content: options.system });

  output.write(
    `\n  ${bold("AgyssyyGPT")} ${dim(`v${options.version}`)}\n` +
      `  ${dim("provider:")} ${provider.name}  ${dim("model:")} ${provider.model}\n` +
      `  ${dim("Type /help for commands, /exit to leave.")}\n\n`,
  );

  const rl = createInterface({ input, output });

  try {
    for (;;) {
      let line: string;
      try {
        line = await rl.question(cyan("you> "));
      } catch {
        break;
      }

      const text = line.trim();
      if (!text) continue;

      if (text === "/exit" || text === "/quit") break;
      if (text === "/clear") {
        messages.length = options.system ? 1 : 0;
        output.write(dim("(history cleared)") + "\n");
        continue;
      }
      if (text === "/help") {
        output.write(HELP + "\n");
        continue;
      }
      if (text.startsWith("/")) {
        output.write(dim(`unknown command: ${text}`) + "\n");
        continue;
      }

      messages.push({ role: "user", content: text });
      try {
        const reply = await provider.chat(messages);
        messages.push({ role: "assistant", content: reply });
        options.logger?.append(messages, {
          version: options.version,
          provider: provider.name,
          model: provider.model,
        });
        output.write(green("agys> ") + reply + "\n");
      } catch (error) {
        messages.pop();
        const message =
          error instanceof ProviderError || error instanceof Error
            ? error.message
            : String(error);
        output.write(red("error: ") + message + "\n");
      }
    }
  } finally {
    rl.close();
  }

  output.write(dim("bye") + "\n");
}
