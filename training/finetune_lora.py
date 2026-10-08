#!/usr/bin/env python3
"""QLoRA fine-tune of an open chat model on AgyssyyGPT conversation logs.

Runs on a single free GPU (Kaggle / Colab, ~16 GB) using 4-bit quantization and LoRA
adapters. The dataset is the JSONL produced by `agys --log` and cleaned with
`prepare_dataset.py` (a local file or a Hugging Face Hub dataset id).

Example:
    python finetune_lora.py \\
        --dataset dataset.jsonl \\
        --base-model Qwen/Qwen2.5-3B-Instruct \\
        --output outputs/agysyygpt-lora \\
        --push-to-hub your-name/agysyygpt-lora
"""
from __future__ import annotations

import argparse
import inspect

DEFAULT_TARGET_MODULES = [
    "q_proj",
    "k_proj",
    "v_proj",
    "o_proj",
    "gate_proj",
    "up_proj",
    "down_proj",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dataset", required=True, help="path to a JSONL file or a Hub dataset id")
    parser.add_argument("--base-model", default="Qwen/Qwen2.5-3B-Instruct")
    parser.add_argument("--output", default="outputs/agysyygpt-lora")
    parser.add_argument("--epochs", type=float, default=3.0)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--grad-accum", type=int, default=16)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--max-seq-len", type=int, default=2048)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--target-modules", nargs="+", default=DEFAULT_TARGET_MODULES)
    parser.add_argument("--precision", choices=["fp16", "bf16", "fp32"], default="fp16")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--push-to-hub", metavar="REPO_ID", help="push the trained adapter to the Hub")
    parser.add_argument("--no-4bit", action="store_true", help="disable 4-bit quantization")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    import torch
    from datasets import load_dataset
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        DataCollatorForLanguageModeling,
        Trainer,
        TrainingArguments,
    )

    use_cuda = torch.cuda.is_available()
    compute_dtype = torch.bfloat16 if args.precision == "bf16" else torch.float16
    use_4bit = use_cuda and not args.no_4bit

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    quant_config = None
    if use_4bit:
        quant_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=compute_dtype,
            bnb_4bit_use_double_quant=True,
        )

    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=quant_config,
        device_map="auto" if use_cuda else None,
        torch_dtype=compute_dtype if use_cuda else torch.float32,
        trust_remote_code=True,
    )
    model.config.use_cache = False

    if quant_config is not None:
        model = prepare_model_for_kbit_training(model)

    model = get_peft_model(
        model,
        LoraConfig(
            r=args.lora_r,
            lora_alpha=args.lora_alpha,
            lora_dropout=args.lora_dropout,
            bias="none",
            task_type="CAUSAL_LM",
            target_modules=args.target_modules,
        ),
    )
    model.print_trainable_parameters()

    raw = load_dataset("json", data_files=args.dataset, split="train")

    def tokenize(example: dict) -> dict:
        text = tokenizer.apply_chat_template(
            example["messages"], tokenize=False, add_generation_prompt=False
        )
        return tokenizer(text, truncation=True, max_length=args.max_seq_len, add_special_tokens=False)

    tokenized = raw.map(tokenize, remove_columns=raw.column_names)

    training_kwargs = {
        "output_dir": args.output,
        "num_train_epochs": args.epochs,
        "per_device_train_batch_size": args.batch_size,
        "gradient_accumulation_steps": args.grad_accum,
        "learning_rate": args.lr,
        "lr_scheduler_type": "cosine",
        "warmup_ratio": 0.03,
        "logging_steps": 10,
        "save_strategy": "epoch",
        "save_total_limit": 2,
        "gradient_checkpointing": use_cuda,
        "optim": "paged_adamw_8bit" if use_4bit else "adamw_torch",
        "fp16": args.precision == "fp16" and use_cuda,
        "bf16": args.precision == "bf16" and use_cuda,
        "report_to": [],
        "seed": args.seed,
    }
    # TrainingArguments differs across transformers versions - keep only supported args.
    supported = set(inspect.signature(TrainingArguments.__init__).parameters)
    dropped = sorted(k for k in training_kwargs if k not in supported)
    if dropped:
        print(f"note: installed transformers ignores: {', '.join(dropped)}")
    training_args = TrainingArguments(**{k: v for k, v in training_kwargs.items() if k in supported})

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized,
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
    )
    trainer.train()
    trainer.save_model(args.output)
    tokenizer.save_pretrained(args.output)
    print(f"saved LoRA adapter -> {args.output}")

    if args.push_to_hub:
        model.push_to_hub(args.push_to_hub)
        tokenizer.push_to_hub(args.push_to_hub)
        print(f"pushed adapter -> https://huggingface.co/{args.push_to_hub}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
