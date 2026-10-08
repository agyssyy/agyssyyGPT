# Training your own AgyssyyGPT model

Goal: collect your own conversations with `agys`, store them on the **Hugging Face Hub**
(free), and **LoRA fine-tune** an open base model so it picks up your style and knowledge.

This is fine-tuning, not training from scratch — it runs on a **free GPU** (Kaggle or
Colab, ~16 GB) in well under an hour for a few thousand examples.

## 0. Free resources

| Need | Service | Free tier |
| ---- | ------- | --------- |
| GPU to train | [Kaggle Notebooks](https://www.kaggle.com/code) | ~30 GPU h/week (P100 / 2×T4) |
| GPU to train | [Google Colab](https://colab.research.google.com) | T4 (session-limited) |
| Dataset + model hosting | [Hugging Face Hub](https://huggingface.co) | unlimited public / free private |
| Local inference after training | [Ollama](https://ollama.com) | free |

Create a Hugging Face account and a **write** token: <https://huggingface.co/settings/tokens>.

## 1. Collect conversations

Every completed chat can be appended to a JSONL file (opt-in):

```sh
agys --log logs/chats.jsonl                       # interactive, logs each turn
agys --log logs/chats.jsonl "explain monads"      # one-shot
```

Each line is a record:

```json
{"messages":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}],
 "metadata":{"source":"agysyygpt","version":"0.1.0","provider":"ollama","model":"..."}}
```

> Only log what you are allowed to share. Review the file before publishing it.

## 2. Clean + publish the dataset

```sh
pip install datasets huggingface_hub
huggingface-cli login                     # paste your write token

python prepare_dataset.py logs/*.jsonl \
  --output dataset.jsonl \
  --push-to-hub YOUR-NAME/agysyygpt-chats
```

`prepare_dataset.py` drops malformed records and conversations with no user/assistant
turn, then optionally pushes a validated dataset to the Hub.

## 3. Fine-tune (on a free GPU)

Easiest path: use a ready-made notebook —
**[`kaggle-finetune.ipynb`](kaggle-finetune.ipynb)** (Kaggle) or
**[`colab-finetune.ipynb`](colab-finetune.ipynb)** (Colab). Import it, add an
`HF_TOKEN` secret, and run the cells. Prefer the command line? In a Kaggle/Colab
notebook, clone the repo, enable a GPU accelerator, then:

```sh
pip install -r requirements.txt
huggingface-cli login

python finetune_lora.py \
  --dataset YOUR-NAME/agysyygpt-chats \
  --base-model Qwen/Qwen2.5-3B-Instruct \
  --output outputs/agysyygpt-lora \
  --epochs 3 --max-seq-len 2048 \
  --push-to-hub YOUR-NAME/agysyygpt-lora
```

Handy flags: `--no-4bit` (full precision, needs more VRAM), `--precision bf16` (A100/L4),
`--lora-r 32`, `--batch-size 2 --grad-accum 8`.

The output is a small **LoRA adapter** — not a full model. That is what gets pushed to the
Hub under `YOUR-NAME/agysyygpt-lora`.

## 4. Run it locally

Merge the LoRA adapter into the base model (validated on CPU):

```sh
python merge_adapter.py \
  --base-model Qwen/Qwen2.5-3B-Instruct \
  --adapter YOUR-NAME/agysyygpt-lora \
  --output merged
```

Convert to GGUF and register it with Ollama — the helper clones llama.cpp on first run:

```powershell
./to_gguf.ps1 -ModelDir merged -Name agysyygpt          # Windows
```
```sh
./to_gguf.sh merged agysyygpt q4_k_m                    # macOS / Linux
```

Then chat:

```sh
agys -p ollama -m agysyygpt
```

> Ollama's direct safetensors import only supports some architectures (Qwen2 is not one
> of them), so GGUF conversion through llama.cpp is the reliable path.

## Files

| File | Purpose |
| ---- | ------- |
| `prepare_dataset.py` | Validate JSONL logs, emit a clean dataset, push to the Hub |
| `finetune_lora.py` | QLoRA fine-tune with transformers + PEFT |
| `merge_adapter.py` | Merge a LoRA adapter into the base model |
| `to_gguf.ps1` / `to_gguf.sh` | Convert to GGUF and register with Ollama |
| `kaggle-finetune.ipynb` | Turnkey Kaggle notebook: clone → train → push |
| `colab-finetune.ipynb` | Turnkey Colab notebook: clone → train → push |
| `requirements.txt` | Python dependencies for training |
