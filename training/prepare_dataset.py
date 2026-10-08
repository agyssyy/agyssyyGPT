#!/usr/bin/env python3
"""Validate AgyssyyGPT conversation logs and (optionally) publish them to the Hugging Face Hub.

Input: one or more JSONL files produced by `agys --log data.jsonl`.
Output: a cleaned JSONL dataset, and optionally a Hugging Face dataset repo.

Example:
    python prepare_dataset.py data.jsonl --output dataset.jsonl
    python prepare_dataset.py logs/*.jsonl --push-to-hub your-name/agysyygpt-chats
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

VALID_ROLES = {"system", "user", "assistant"}


def load_records(paths: list[Path]) -> list[dict]:
    records: list[dict] = []
    skipped = 0
    for path in paths:
        with path.open("r", encoding="utf-8") as handle:
            for lineno, raw in enumerate(handle, 1):
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    obj = json.loads(raw)
                except json.JSONDecodeError:
                    skipped += 1
                    print(f"  ! {path}:{lineno} not valid JSON, skipped", file=sys.stderr)
                    continue

                messages = obj.get("messages")
                if not isinstance(messages, list) or not messages:
                    skipped += 1
                    continue

                clean: list[dict] = []
                valid = True
                for message in messages:
                    role = message.get("role")
                    content = message.get("content")
                    if role not in VALID_ROLES or not isinstance(content, str) or not content.strip():
                        valid = False
                        break
                    clean.append({"role": role, "content": content})

                if not valid:
                    skipped += 1
                    continue
                if not any(m["role"] == "user" for m in clean):
                    skipped += 1
                    continue
                if not any(m["role"] == "assistant" for m in clean):
                    skipped += 1
                    continue

                records.append({"messages": clean})

    if skipped:
        print(f"  skipped {skipped} malformed record(s)", file=sys.stderr)
    return records


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("inputs", nargs="+", type=Path, help="JSONL log file(s) from `agys --log`")
    parser.add_argument("--output", type=Path, default=Path("dataset.jsonl"), help="cleaned JSONL output")
    parser.add_argument("--push-to-hub", metavar="REPO_ID", help="e.g. your-name/agysyygpt-chats")
    parser.add_argument("--private", action="store_true", help="create the Hub dataset as private")
    args = parser.parse_args()

    records = load_records(args.inputs)
    if not records:
        print("no valid records found", file=sys.stderr)
        return 1

    with args.output.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")

    turns = sum(len(r["messages"]) for r in records)
    print(f"wrote {len(records)} conversations ({turns} messages) -> {args.output}")

    if args.push_to_hub:
        try:
            from datasets import Dataset
        except ImportError:
            print("install `datasets` to push to the Hub: pip install datasets", file=sys.stderr)
            return 1

        dataset = Dataset.from_list(records)
        dataset.push_to_hub(args.push_to_hub, private=args.private)
        print(f"pushed dataset -> https://huggingface.co/datasets/{args.push_to_hub}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
