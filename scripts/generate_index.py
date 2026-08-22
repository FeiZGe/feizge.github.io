#!/usr/bin/env python3
"""
generate_index.py
Scans all .html and .pdf files under /learn and generates learn/index.json.

Title is auto-generated from filename:
  ip-address.html  ->  IP Address
  python-loop.pdf  ->  Python Loop

Usage:
  python3 scripts/generate_index.py
  (run from repo root)
"""

import json
import re
import subprocess
import sys
from pathlib import Path

# ─── Config ──────────────────────────────────────────────────────
LEARN_DIR      = Path('learn')
OUTPUT         = LEARN_DIR / 'index.json'
# File types to index; add more extensions here if needed
SUPPORTED_EXTS = {'.html', '.pdf'}


def filename_to_title(stem: str) -> str:
    """Convert filename stem to a human-readable title.
    ip-address  ->  IP Address
    python-loop ->  Python Loop
    xss         ->  XSS
    """
    words = re.split(r'[-_]+', stem)
    result = []
    for word in words:
        # Short words (≤3 chars) are treated as acronyms: uppercase
        if len(word) <= 3:
            result.append(word.upper())
        else:
            result.append(word.capitalize())
    return ' '.join(result)


def folder_to_category(folder: str) -> str:
    """Top-level folder becomes the category label.
    networking/basic   ->  Networking
    programming/python ->  Programming
    """
    top = folder.split('/')[0] if '/' in folder else folder
    return top.capitalize()


def get_git_timestamp(file_path: Path) -> str | None:
    """Return the last git-commit timestamp (ISO 8601) for a file, or None."""
    try:
        result = subprocess.run(
            ['git', 'log', '-1', '--format=%cI', '--', str(file_path)],
            capture_output=True, text=True, timeout=10
        )
        ts = result.stdout.strip()
        return ts if ts else None
    except Exception:
        return None


def scan_learn_dir() -> list[dict]:
    """Recursively scan LEARN_DIR for supported file types.
    Returns a list of dicts matching the index.json schema.
    """
    items = []

    # Collect all supported files, sorted for deterministic output
    all_files = sorted(
        f for f in LEARN_DIR.rglob('*')
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTS
    )

    for file in all_files:
        # Skip hidden files and files inside hidden directories
        if any(part.startswith('.') for part in file.parts):
            continue

        rel_path  = file.relative_to(LEARN_DIR)   # e.g. networking/ip-address.html
        path_str  = rel_path.as_posix()

        folder = rel_path.parent.as_posix()
        if folder == '.':
            folder = ''   # files directly inside learn/ have no subfolder

        depth     = len(rel_path.parts) - 1         # folder depth (filename excluded)
        title     = filename_to_title(file.stem)
        category  = folder_to_category(folder) if folder else ''
        file_type = file.suffix.lstrip('.').lower()  # 'html' or 'pdf'

        entry = {
            'title':    title,
            'path':     path_str,
            'category': category,
            'folder':   folder,
            'depth':    depth,
            'type':     file_type,
        }

        last_updated = get_git_timestamp(file)
        if last_updated:
            entry['lastUpdated'] = last_updated

        items.append(entry)

    return items


def main():
    if not LEARN_DIR.exists():
        print(f'ERROR: {LEARN_DIR} directory not found. Run from repo root.', file=sys.stderr)
        sys.exit(1)

    items = scan_learn_dir()

    OUTPUT.write_text(
        json.dumps(items, indent=2, ensure_ascii=False),
        encoding='utf-8'
    )

    html_count = sum(1 for i in items if i['type'] == 'html')
    pdf_count  = sum(1 for i in items if i['type'] == 'pdf')
    print(f'Generated {OUTPUT} with {len(items)} entries '
          f'({html_count} HTML, {pdf_count} PDF).')


if __name__ == '__main__':
    main()

