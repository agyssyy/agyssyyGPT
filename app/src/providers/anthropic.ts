import { Message, Provider, ProviderConfig, ProviderError } from "./types.js";

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
}

export class AnthropicProvider implements Provider {
  readonly name = "anthropic";
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    this.baseUrl = (config.baseUrl ?? "https://api.anthropic.com/v1").replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  async chat(messages: Message[]): Promise<string> {
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const conversation = messages.filter((m) => m.role !== "system");

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        ...(this.apiKey ? { "x-api-key": this.apiKey } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        ...(system ? { system } : {}),
        messages: conversation,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as AnthropicResponse;

    if (!res.ok) {
      throw new ProviderError(
        data.error?.message ?? `Anthropic request failed with status ${res.status}`,
        res.status,
      );
    }

    const content = data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("");

    if (!content) {
      throw new ProviderError("Anthropic returned an empty response");
    }
    return content;
  }
}
