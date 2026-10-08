#!/usr/bin/env bash
# Convert a merged Hugging Face model directory to GGUF and register it with Ollama.
#
# Usage:
#   training/to_gguf.sh <model-dir> [name] [quant]
# Example:
#   training/to_gguf.sh outputs/merged agysyygpt q4_k_m
set -euo pipefail

MODEL_DIR="${1:?usage: to_gguf.sh <model-dir> [name] [quant]}"
NAME="${2:-agysyygpt}"
QUANT="${3:-q4_k_m}"
LLAMA_CPP="${LLAMA_CPP:-$HOME/.cache/llama.cpp}"

if [ ! -d "$LLAMA_CPP" ]; then
  echo "Cloning llama.cpp -> $LLAMA_CPP"
  git clone --depth 1 https://github.com/ggerganov/llama.cpp "$LLAMA_CPP"
fi

python -m pip install -q -r "$LLAMA_CPP/requirements/requirements-convert_hf_to_gguf.txt"

MODEL_DIR="$(cd "$MODEL_DIR" && pwd)"
OUTFILE="$MODEL_DIR/$NAME.gguf"
python "$LLAMA_CPP/convert_hf_to_gguf.py" "$MODEL_DIR" --outfile "$OUTFILE" --outtype "$QUANT"

printf 'FROM %s\n' "$OUTFILE" > "$MODEL_DIR/Modelfile"
ollama create "$NAME" -f "$MODEL_DIR/Modelfile"

echo "done -> agys -p ollama -m $NAME"
