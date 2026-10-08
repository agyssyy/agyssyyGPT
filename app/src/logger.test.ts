import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DatasetLogger } from "./logger.js";

describe("DatasetLogger", () => {
  it("appends one JSON record per completed conversation", () => {
    const dir = mkdtempSync(join(tmpdir(), "agysyy-log-"));
    const path = join(dir, "data.jsonl");
    const logger = new DatasetLogger(path);
    const meta = { version: "0.1.0", provider: "ollama", model: "qwen2.5" };

    logger.append(
      [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hey" },
      ],
      meta,
    );
    logger.append([{ role: "user", content: "bye" }], meta);

    const lines = readFileSync(path, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);

    const first = JSON.parse(lines[0]!);
    expect(first.messages[1]).toEqual({ role: "assistant", content: "hey" });
    expect(first.metadata).toMatchObject({
      source: "agysyygpt",
      version: "0.1.0",
      provider: "ollama",
      model: "qwen2.5",
    });
    expect(typeof first.metadata.timestamp).toBe("string");

    rmSync(dir, { recursive: true, force: true });
  });
});
