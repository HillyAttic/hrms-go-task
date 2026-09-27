"""Restore spaces deleted from string literals across the working tree.

A whitespace-stripping edit ran over the uncommitted diff: it removed spaces
*inside* string literals (and, in server-auth.ts, inside the `'Bearer '` scheme
prefix — which 401s every authenticated API call).

Only line pairs that are identical once all whitespace is removed are restored,
so every genuinely-changed line (e.g. the design-token migration) is left alone.

Usage: repair_string_spaces.py [--apply]
"""
import difflib
import re
import subprocess
import sys

APPLY = "--apply" in sys.argv
FIXED = re.compile(r"[\s'\"`]")


def changed_files():
    out = subprocess.run(
        ["git", "diff", "--name-only"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=True,
    ).stdout
    return [f for f in out.splitlines() if f.endswith((".ts", ".tsx"))]


def head_lines(path):
    out = subprocess.run(
        ["git", "show", f"HEAD:{path}"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=True,
    ).stdout
    return out.splitlines()


def main():
    total_lines = 0
    touched_files = []

    for path in changed_files():
        try:
            with open(path, encoding="utf-8") as fh:
                current = fh.read().splitlines()
            original = head_lines(path)
        except (UnicodeDecodeError, subprocess.CalledProcessError):
            continue

        # Tolerate line-ending noise: compare streams, not raw bytes.
        current = [ln.rstrip("\r") for ln in current]
        original = [ln.rstrip("\r") for ln in original]

        result = list(current)
        repaired = 0

        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(
            None, original, current, autojunk=False
        ).get_opcodes():
            if tag != "replace" or (i2 - i1) != (j2 - j1):
                continue
            for off in range(i2 - i1):
                old, new = original[i1 + off], current[j1 + off]
                if old == new:
                    continue
                # Identical apart from whitespace ⇒ the diff deleted spaces that
                # were part of the literal, not a real edit.
                if FIXED.sub("", old) == FIXED.sub("", new):
                    result[j1 + off] = old
                    repaired += 1

        if repaired:
            touched_files.append((path, repaired))
            total_lines += repaired
            if APPLY:
                with open(path, "w", encoding="utf-8", newline="\n") as fh:
                    fh.write("\n".join(result) + "\n")

    verb = "Restored" if APPLY else "Would restore"
    for path, n in touched_files:
        print(f"  {n:>3}  {path}")
    print(f"\n{verb} {total_lines} line(s) across {len(touched_files)} file(s).")
    if not APPLY:
        print("Dry run — re-run with --apply to write.")


if __name__ == "__main__":
    main()
