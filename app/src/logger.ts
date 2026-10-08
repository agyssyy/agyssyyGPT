import { appendFileSync } from "node:fs";
import type { Message } from "./providers/types.js";

export interface LogMetadata {
  source: "agysyygpt";
  version: string;
  provider: string;
  model: string;
  timestamp: string;
}

export interface LogRecord {
  messages: Message[];
  metadata: LogMetadata;
}

/**
 * Appends completed conversations to a JSONL dataset file (one record per line).
 * This is the raw material for fine-tuning: `training/prepare_dataset.py` reads it.
 */
export class DatasetLogger {
  constructor(readonly path: string) {}

  append(messages: Message[], meta: { version: string; provider: string; model: string }): void {
    const record: LogRecord = {
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      metadata: {
        source: "agysyygpt",
        version: meta.version,
        provider: meta.provider,
        model: meta.model,
        timestamp: new Date().toISOString(),
      },
    };

    try {
      appendFileSync(this.path, JSON.stringify(record) + "\n", "utf8");
    } catch (error) {
      process.stderr.write(
        `warning: could not write dataset log (${this.path}): ` +
          `${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  }
}
