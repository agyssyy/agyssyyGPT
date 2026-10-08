# AgyssyyGPT

> An AI chat that lives in your terminal.

`agys` is a small, fast terminal client for large language models with **pluggable
providers** — OpenAI, Anthropic, or a local [Ollama](https://ollama.com) server. Start
an interactive chat or fire a one-shot prompt without leaving your shell.

```console
$ agys "explain monads in one line"
agys> A monad is just a monoid in the category of endofunctors.
```

## Install

Three distribution channels, one codebase:

| Channel | Contents | Purpose |
| ------- | -------- | ------- |
| **npm** (`agyssyy`) | `agyssyy.exe` + `README.md` only | `npx`/global install of the Windows launcher |
| **Website** | links to every package | human-friendly downloads, mirrors GitHub |
| **GitHub Releases** | **full** package set + checksums + changelog | the source of truth |

```sh
# npm (Windows launcher)
npm install -g agyssyy
# or
npx agyssyy

# everything else
# https://github.com/agyssyy/agyssyygpt/releases
```

## Usage

```sh
agys                          # interactive chat
agys "explain monads"         # one-shot prompt
agys -p ollama -m llama3.2    # local model
agys -p openai -m gpt-4o-mini # OpenAI
agys -p anthropic             # Anthropic
agys --help
```

Inside the chat: `/help`, `/clear`, `/exit`.

### Providers

| Provider    | Auth                | Default endpoint               |
| ----------- | ------------------- | ------------------------------ |
| `openai`    | `OPENAI_API_KEY`    | `https://api.openai.com/v1`    |
| `anthropic` | `ANTHROPIC_API_KEY` | `https://api.anthropic.com/v1` |
| `ollama`    | none (local)        | `http://localhost:11434`       |

Provider selection order: `--provider` flag → config file → `AGYSYY_PROVIDER` → auto
(OpenAI key, then Anthropic key, then Ollama).

### Configuration

Resolved in order: **CLI flags → environment variables → `./agysyy.toml` →
`~/.config/agysyy/config.toml`**. See [`agysyy.example.toml`](agysyy.example.toml).

```toml
provider = "ollama"
model = "llama3.2"
base_url = "http://localhost:11434"
system = "You are a concise terminal assistant."
```

## Repository layout

```
app/                     TypeScript source for the agys CLI (builds the .exe)
  src/providers/         openai.ts, anthropic.ts, ollama.ts
  src/config.ts          config + env resolution
  src/repl.ts            interactive loop
packages/npm/            published npm package (agyssyy.exe + README.md)
training/                data prep + LoRA fine-tuning scripts (Python)
web/                     static landing page (GitHub Pages)
scripts/                 build.sh / build.ps1 / build.bat, build-exe, package-npm
.github/workflows/       ci.yml, release.yml, pages.yml
agysyy.example.toml      sample configuration
```

## Development

```sh
npm install
npm run typecheck
npm test
npm run build          # bundle app/dist
npm run build:exe      # produce agyssyy.exe (Windows, best effort)
npm run package:npm:pack
```

Or run the wrapper script for your shell:

```sh
scripts/build.sh        # bash
scripts/build.ps1       # PowerShell
scripts/build.bat       # cmd.exe
```

## Train your own model

`agys` can log your conversations, and [`training/`](training/README.md) turns them into a
LoRA fine-tune of an open model — on free GPU (Kaggle/Colab) and free storage on the
Hugging Face Hub.

```sh
agys --log logs/chats.jsonl                 # collect data (opt-in)
python training/prepare_dataset.py logs/*.jsonl --push-to-hub YOU/agysyygpt-chats
python training/finetune_lora.py --dataset YOU/agysyygpt-chats --base-model Qwen/Qwen2.5-3B-Instruct
```

See [`training/README.md`](training/README.md) for the full walkthrough.

## License

MIT
