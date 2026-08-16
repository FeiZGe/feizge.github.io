#!/usr/bin/env python3
"""
generate_index.py
Scans all .html files under /learn and generates learn/index.json.

Title is auto-generated from filename:
  ip-address.html  ->  IP Address
  python-loop.html ->  Python Loop

Usage:
  python3 scripts/generate_index.py
  (run from repo root)
"""

import json
import os
import re
import subprocess
import sys
from datetime import timezone
from pathlib import Path

# ─── Config ──────────────────────────────────────────────────────
LEARN_DIR  = Path('learn')
OUTPUT     = LEARN_DIR / 'index.json'


def filename_to_title(stem: str) -> str:
    """Convert filename stem to a human-readable title.
    ip-address  ->  IP Address
    python-loop ->  Python Loop
    xss         ->  XSS
    """
    # Split on dashes and underscores
    words = re.split(r'[-_]+', stem)
    result = []
    for word in words:
        # All-uppercase abbreviations stay uppercase (e.g. xss, ip, tcp)
        if len(word) <= 3:
            result.append(word.upper())
        else:
            result.append(word.capitalize())
    return ' '.join(result)


def folder_to_category(folder: str) -> str:
    """Top-level folder becomes category.
    networking/basic  ->  Networking
    programming/python ->  Programming
    """
    top = folder.split('/')[0] if '/' in folder else folder
    return top.capitalize()


def get_git_timestamp(file_path: Path) -> str | None:
    """Get the last commit timestamp for a file using git log.
    Returns ISO 8601 string or None if not available.
    """
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
    """Recursively scan LEARN_DIR for .html files.
    Returns list of dicts matching the index.json schema.
    """
    items = []

    for html_file in sorted(LEARN_DIR.rglob('*.html')):
        # Ignore hidden files / hidden directories
        if any(part.startswith('.') for part in html_file.parts):
            continue

        # Relative path from LEARN_DIR (e.g. networking/ip-address.html)
        rel_path = html_file.relative_to(LEARN_DIR)
        path_str = rel_path.as_posix()

        # Folder = parent directory relative to LEARN_DIR
        folder = rel_path.parent.as_posix()
        if folder == '.':
            folder = ''   # files directly in learn/ have no subfolder

        # Depth = number of folder levels
        depth = len(rel_path.parts) - 1  # subtract 1 for the filename itself

        # Title from stem
        title = filename_to_title(html_file.stem)

        # Category from top-level folder
        category = folder_to_category(folder) if folder else ''

        # Timestamp from git (optional)
        last_updated = get_git_timestamp(html_file)

        entry = {
            'title':    title,
            'path':     path_str,
            'category': category,
            'folder':   folder,
            'depth':    depth,
        }
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

    print(f'Generated {OUTPUT} with {len(items)} entries.')


if __name__ == '__main__':
    main()
