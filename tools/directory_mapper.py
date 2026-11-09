"""Write this repo's tree into docs/directory-structure.md, with Claude-Code-Setup's mapper.

    python tools/directory_mapper.py [--depth N] [--stdout]

A stand-in written by Claude-Code-Setup's setup-root.ps1: it runs the real
tools/directory_mapper.py there with --root set to this repo, and passes on
everything else. The tool itself, and what it writes, are described there.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Claude-Code-Setup, at this path from this repo (setup-root.ps1 writes it).
SETUP = (ROOT / "../../Claude-Code-Setup").resolve()
MAPPER = SETUP / "tools" / "directory_mapper.py"


def main(argv: list[str] | None = None) -> int:
    if not MAPPER.is_file():
        print(f"Claude-Code-Setup's mapper isn't at {MAPPER}", file=sys.stderr)
        return 1
    args = sys.argv[1:] if argv is None else argv
    return subprocess.run([sys.executable, str(MAPPER), "--root", str(ROOT), *args]).returncode


if __name__ == "__main__":
    sys.exit(main())
