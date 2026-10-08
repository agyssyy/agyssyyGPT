import { describe, expect, it } from "vitest";
import { createProvider, KNOWN_PROVIDERS } from "./index.js";
import { ProviderError } from "./types.js";

describe("createProvider", () => {
  it("creates every known provider", () => {
    for (const provider of KNOWN_PROVIDERS) {
      const instance = createProvider({ provider, model: "test-model" });
      expect(instance.name).toBe(provider);
      expect(instance.model).toBe("test-model");
    }
  });

  it("throws on an unknown provider", () => {
    expect(() => createProvider({ provider: "nope", model: "m" })).toThrow(ProviderError);
  });
});
