# agyssyy

**AgyssyyGPT** — an AI chat that lives in your terminal.

This npm package ships the prebuilt **`agyssyy.exe`** launcher plus this README. Nothing
else is bundled here — the full source, other platform packages, and checksums live on
[GitHub Releases](https://github.com/agyssyy/agyssyygpt/releases) and the
[project website](https://agyssyy.github.io/agyssyygpt).

## Install

```sh
npm install -g agyssyy
# or run without installing
npx agyssyy --help
```

The command installed is **`agys`**.

## Usage

```sh
agys                          # interactive chat
agys "explain monads"         # one-shot prompt
agys -p ollama -m llama3.2    # local model via Ollama
agys -p openai -m gpt-4o-mini # OpenAI
agys -p anthropic             # Anthropic
```

### Providers

| Provider    | Auth                | Default endpoint              |
| ----------- | ------------------- | ----------------------------- |
| `openai`    | `OPENAI_API_KEY`    | `https://api.openai.com/v1`   |
| `anthropic` | `ANTHROPIC_API_KEY` | `https://api.anthropic.com/v1`|
| `ollama`    | none (local)        | `http://localhost:11434`      |

If no provider is given, AgyssyyGPT picks OpenAI when `OPENAI_API_KEY` is set, then
Anthropic when `ANTHROPIC_API_KEY` is set, otherwise it falls back to local Ollama.

### Config

Resolved in order: CLI flags → environment variables → `./agysyy.toml` →
`~/.config/agysyy/config.toml`.

```toml
provider = "ollama"
model = "llama3.2"
base_url = "http://localhost:11434"
system = "You are a concise terminal assistant."
```

## Platform support

The bundled launcher targets **Windows**. macOS and Linux packages are published on
GitHub Releases and the project website.

## License

MIT
