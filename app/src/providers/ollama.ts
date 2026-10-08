import { Message, Provider, ProviderConfig, ProviderError } from "./types.js";

interface OllamaResponse {
  message?: { content?: string };
  error?: string;
}

export class OllamaProvider implements Provider {
  readonly name = "ollama";
  readonly model: string;
  private readonly host: string;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    this.host = (config.baseUrl ?? "http://localhost:11434").replace(/\/+$/, "");
  }

  async chat(messages: Message[]): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${this.host}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: this.model, messages, stream: false }),
      });
    } catch {
      throw new ProviderError(
        `Could not reach Ollama at ${this.host}. Is it running? Try: ollama serve`,
      );
    }

    const data = (await res.json().catch(() => ({}))) as OllamaResponse;

    if (!res.ok) {
      throw new ProviderError(
        data.error ?? `Ollama request failed with status ${res.status}`,
        res.status,
      );
    }

    const content = data.message?.content;
    if (typeof content !== "string") {
      throw new ProviderError("Ollama returned an empty response");
    }
    return content;
  }
}
