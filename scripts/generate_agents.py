#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Generate AGENTS.md from AGENTS_TEMPLATE.md and SKILL.md frontmatter.

Also validates the surfaces that still list skills by hand: marketplace.json and the
README skills table stay in sync with the discovered skills, and every manifest ships
the same version.

Usage:
  uv run scripts/generate_agents.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = ROOT / "scripts" / "AGENTS_TEMPLATE.md"
OUTPUT_PATH = ROOT / "agents" / "AGENTS.md"
MARKETPLACE_PATH = ROOT / ".claude-plugin" / "marketplace.json"
PLUGIN_PATH = ROOT / ".claude-plugin" / "plugin.json"
GEMINI_EXTENSION_PATH = ROOT / "gemini-extension.json"
README_PATH = ROOT / "README.md"


def load_template() -> str:
    return TEMPLATE_PATH.read_text(encoding="utf-8")


def parse_frontmatter(text: str) -> dict[str, str]:
    """Parse a minimal YAML-ish frontmatter block without external deps."""
    match = re.search(r"^---\s*\n(.*?)\n---\s*", text, re.DOTALL)
    if not match:
        return {}
    data: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip()
    return data


def collect_skills() -> list[dict[str, str]]:
    skills: list[dict[str, str]] = []
    for skill_md in ROOT.glob("skills/*/SKILL.md"):
        meta = parse_frontmatter(skill_md.read_text(encoding="utf-8"))
        name = meta.get("name")
        description = meta.get("description")
        if not name or not description:
            continue
        skills.append(
            {
                "name": name,
                "description": description,
                "path": str(skill_md.parent.relative_to(ROOT)),
            }
        )
    # Keep deterministic order for consistent output
    return sorted(skills, key=lambda s: s["name"].lower())


def render(template: str, skills: list[dict[str, str]]) -> str:
    """Very small Mustache-like renderer that only supports a single skills loop."""
    def repl(match: re.Match[str]) -> str:
        block = match.group(1).strip("\n")
        rendered_blocks = []
        for skill in skills:
            rendered = (
                block.replace("{{name}}", skill["name"])
                .replace("{{description}}", skill["description"])
                .replace("{{path}}", skill["path"])
            )
            rendered_blocks.append(rendered)
        return "\n".join(rendered_blocks)

    # Render loop blocks
    content = re.sub(r"{{#skills}}(.*?){{/skills}}", repl, template, flags=re.DOTALL)
    return content


def validate_marketplace(skills: list[dict[str, str]]) -> list[str]:
    """Validate marketplace.json against discovered skills. Returns error messages."""
    if not MARKETPLACE_PATH.exists():
        return [f"marketplace.json not found at {MARKETPLACE_PATH}"]

    marketplace = json.loads(MARKETPLACE_PATH.read_text(encoding="utf-8"))
    plugins = marketplace.get("plugins", [])
    errors: list[str] = []

    # Every plugin with skills should have at least one SKILL.md
    for plugin in plugins:
        source = plugin.get("source", "").lstrip("./")
        plugin_skills = [s for s in skills if s["path"].startswith(source)]
        if not plugin_skills:
            errors.append(
                f"Plugin '{plugin['name']}' at '{source}' has no SKILL.md files"
            )

    # Every discovered skill should be covered by a plugin
    for skill in skills:
        found = any(
            skill["path"].startswith(p.get("source", "").lstrip("./"))
            for p in plugins
        )
        if not found:
            errors.append(
                f"Skill '{skill['name']}' at '{skill['path']}' is not covered by any plugin"
            )

    return errors


def validate_readme(skills: list[dict[str, str]]) -> list[str]:
    """Validate the README skills table and badge count. Returns error messages.

    The table's prose is hand-written and richer than the SKILL.md descriptions, so
    only the set of names and the count are checked - a new skill cannot land without
    the README noticing, and the copy stays human.
    """
    if not README_PATH.exists():
        return [f"README.md not found at {README_PATH}"]

    readme = README_PATH.read_text(encoding="utf-8")
    section = re.search(r"^## Skills\n(.*?)^## ", readme, re.DOTALL | re.MULTILINE)
    if not section:
        return ["README.md has no '## Skills' section to validate"]

    errors: list[str] = []

    # First cell of every table row, keyed on the skills/<name>/ link target rather
    # than the backticked name text - catches rows linking to a nonexistent skill
    # folder, and survives a row losing its backticks.
    listed = set(re.findall(r"^\|[^|]*\]\(skills/([a-z0-9][a-z0-9-]*)/?\)", section.group(1), re.MULTILINE))
    discovered = {skill["name"] for skill in skills}

    for name in sorted(discovered - listed):
        errors.append(f"Skill '{name}' is missing from the README '## Skills' table")
    for name in sorted(listed - discovered):
        errors.append(f"README '## Skills' table lists '{name}', which has no skills/{name}/SKILL.md")

    # The `## Installation` section repeats every skill name as its own install command.
    installed = set(re.findall(r"^/plugin install ([a-z0-9][a-z0-9-]*)@", readme, re.MULTILINE))
    for name in sorted(discovered - installed):
        errors.append(f"Skill '{name}' has no '/plugin install' line in README.md")
    for name in sorted(installed - discovered):
        errors.append(f"README.md has a '/plugin install' line for '{name}', which has no skills/{name}/SKILL.md")

    # The count is baked into the shields.io badge twice: its URL and its alt text.
    for pattern, label in ((r"badge/Skills-(\d+)-", "badge URL"), (r'alt="(\d+) Skills"', "badge alt text")):
        match = re.search(pattern, readme)
        if not match:
            errors.append(f"README.md has no skill count in the {label}")
        elif int(match.group(1)) != len(skills):
            errors.append(f"README.md {label} claims {match.group(1)} skills, found {len(skills)}")

    return errors


def validate_versions() -> list[str]:
    """Validate that every manifest ships the same version. Returns error messages.

    Each reader yields (label suffix, version) pairs, so marketplace.json can report
    its own metadata version alongside the per-plugin versions users actually install.
    """
    readers = {
        PLUGIN_PATH: lambda data: [("", data.get("version"))],
        GEMINI_EXTENSION_PATH: lambda data: [("", data.get("version"))],
        MARKETPLACE_PATH: lambda data: [("", data.get("metadata", {}).get("version"))]
        + [
            (f" plugin '{plugin.get('name')}'", plugin.get("version"))
            for plugin in data.get("plugins", [])
        ],
    }

    errors: list[str] = []
    versions: dict[str, str] = {}

    for path, read_versions in readers.items():
        if not path.exists():
            errors.append(f"{path.name} not found at {path}")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for suffix, version in read_versions(data):
            label = f"{path.name}{suffix}"
            if not isinstance(version, str):
                errors.append(f"{label} carries no version string")
                continue
            versions[label] = version

    if len(set(versions.values())) > 1:
        listed = ", ".join(f"{label} {version}" for label, version in sorted(versions.items()))
        errors.append(f"Manifest versions disagree: {listed}")

    return errors


def main() -> None:
    template = load_template()
    skills = collect_skills()
    output = render(template, skills)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(output, encoding="utf-8")
    # flush so this line stays ahead of the unbuffered error output below in CI logs
    print(f"Wrote {OUTPUT_PATH} with {len(skills)} skills.", flush=True)

    # Validate the surfaces that still list skills by hand. Each runs even if another
    # raises, so one broken manifest doesn't hide errors the other checks already found.
    checks = (
        ("Marketplace.json", validate_marketplace, (skills,)),
        ("README.md", validate_readme, (skills,)),
        ("Manifest version", validate_versions, ()),
    )

    results: list[tuple[str, list[str]]] = []
    for label, check, check_args in checks:
        try:
            results.append((label, check(*check_args)))
        except Exception as exc:
            results.append((label, [f"{label} check crashed: {exc}"]))

    failed = [(label, errors) for label, errors in results if errors]
    for label, errors in failed:
        print(f"\n{label} validation errors:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
    if failed:
        sys.exit(1)

    print("Marketplace.json, README.md and manifest version validation passed.")


if __name__ == "__main__":
    main()
