import { Message, Provider, ProviderConfig, ProviderError } from "./types.js";

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export class OpenAIProvider implements Provider {
  readonly name = "openai";
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    this.baseUrl = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  async chat(messages: Message[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: this.model, messages }),
    });

    const data = (await res.json().catch(() => ({}))) as OpenAIChatResponse;

    if (!res.ok) {
      throw new ProviderError(
        data.error?.message ?? `OpenAI request failed with status ${res.status}`,
        res.status,
      );
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new ProviderError("OpenAI returned an empty response");
    }
    return content;
  }
}
