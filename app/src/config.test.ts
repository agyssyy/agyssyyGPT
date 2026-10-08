import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { resolveConfig } from "./config.js";

const dir = mkdtempSync(join(tmpdir(), "agysyy-"));

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("resolveConfig", () => {
  it("detects OpenAI from the environment", () => {
    const config = resolveConfig({}, { OPENAI_API_KEY: "sk-test" });
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.apiKey).toBe("sk-test");
  });

  it("falls back to Ollama with no keys", () => {
    const config = resolveConfig({}, {});
    expect(config.provider).toBe("ollama");
    expect(config.baseUrl).toBe("http://localhost:11434");
  });

  it("prefers explicit CLI options", () => {
    const config = resolveConfig(
      { provider: "anthropic", model: "claude-3-5-haiku-latest" },
      { OPENAI_API_KEY: "sk-test" },
    );
    expect(config.provider).toBe("anthropic");
    expect(config.model).toBe("claude-3-5-haiku-latest");
  });

  it("reads a flat TOML config file", () => {
    const path = join(dir, "agysyy.toml");
    writeFileSync(
      path,
      ['provider = "ollama"', 'model = "llama3.2"', 'system = "be brief"'].join("\n"),
    );
    const config = resolveConfig({ config: path }, {});
    expect(config.provider).toBe("ollama");
    expect(config.model).toBe("llama3.2");
    expect(config.system).toBe("be brief");
  });

  it("lets the environment override the config file", () => {
    const path = join(dir, "env-override.toml");
    writeFileSync(path, 'model = "from-file"\n');
    const config = resolveConfig({ config: path }, { AGYSYY_MODEL: "from-env" });
    expect(config.model).toBe("from-env");
  });

  it("resolves the dataset log path from options then environment", () => {
    expect(resolveConfig({ log: "opt.jsonl" }, {}).log).toBe("opt.jsonl");
    expect(resolveConfig({}, { AGYSYY_LOG: "env.jsonl" }).log).toBe("env.jsonl");
  });
});
