import { AnthropicProvider } from "./anthropic.js";
import { OllamaProvider } from "./ollama.js";
import { OpenAIProvider } from "./openai.js";
import { Provider, ProviderConfig, ProviderError } from "./types.js";

export * from "./types.js";
export { OpenAIProvider } from "./openai.js";
export { AnthropicProvider } from "./anthropic.js";
export { OllamaProvider } from "./ollama.js";

export const KNOWN_PROVIDERS = ["openai", "anthropic", "ollama"] as const;

export type ProviderName = (typeof KNOWN_PROVIDERS)[number];

export function createProvider(config: ProviderConfig): Provider {
  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config);
    case "anthropic":
      return new AnthropicProvider(config);
    case "ollama":
      return new OllamaProvider(config);
    default:
      throw new ProviderError(
        `Unknown provider "${config.provider}". Known providers: ${KNOWN_PROVIDERS.join(", ")}`,
      );
  }
}
