#!/usr/bin/env python3
"""Merge a LoRA adapter into its base model and save a standalone model.

The result is a normal transformers model directory that you can convert to GGUF
for Ollama (see README step 4).

Example:
    python merge_adapter.py \\
        --base-model Qwen/Qwen2.5-3B-Instruct \\
        --adapter outputs/agysyygpt-lora \\
        --output merged
"""
from __future__ import annotations

import argparse


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-model", required=True, help="the model the adapter was trained on")
    parser.add_argument("--adapter", required=True, help="adapter dir (local) or Hub repo id")
    parser.add_argument("--output", default="merged", help="where to write the merged model")
    parser.add_argument("--dtype", choices=["auto", "fp16", "bf16", "fp32"], default="auto")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    dtypes = {
        "auto": "auto",
        "fp16": torch.float16,
        "bf16": torch.bfloat16,
        "fp32": torch.float32,
    }

    base = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=dtypes[args.dtype],
        device_map="auto" if torch.cuda.is_available() else "cpu",
        trust_remote_code=True,
    )
    merged = PeftModel.from_pretrained(base, args.adapter).merge_and_unload()
    merged.save_pretrained(args.output, safe_serialization=True)
    AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True).save_pretrained(args.output)

    print(f"merged model -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
