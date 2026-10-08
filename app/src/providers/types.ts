export type Role = "system" | "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export interface ProviderConfig {
  provider: string;
  model: string;
  system?: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface Provider {
  readonly name: string;
  readonly model: string;
  chat(messages: Message[]): Promise<string>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}
