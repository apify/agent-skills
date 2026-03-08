#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Generate AGENTS.md from AGENTS_TEMPLATE.md and SKILL.md frontmatter.

Also validates that marketplace.json is in sync with discovered skills,
updates the skills table in README.md, and handles version bumping.

Version bumping (conventional commits):
  - BREAKING CHANGE: or feat!: → major bump (1.0.0 → 2.0.0)
  - feat: → minor bump (1.0.0 → 1.1.0)
  - fix:, docs:, chore:, etc. → patch bump (1.0.0 → 1.0.1)

Usage:
  uv run scripts/generate_agents.py                    # Just regenerate
  uv run scripts/generate_agents.py --bump "feat: X"   # Bump based on commit msg

Note: Originally from Apify agent-skills, adapted for ByCrawl.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = ROOT / "scripts" / "AGENTS_TEMPLATE.md"
OUTPUT_PATH = ROOT / "agents" / "AGENTS.md"
MARKETPLACE_PATH = ROOT / ".claude-plugin" / "marketplace.json"
PLUGIN_PATH = ROOT / ".claude-plugin" / "plugin.json"
README_PATH = ROOT / "README.md"
SKILLS_DIR = ROOT / "skills"

# Markers for the auto-generated skills table in README
README_TABLE_START = "<!-- BEGIN_SKILLS_TABLE -->"
README_TABLE_END = "<!-- END_SKILLS_TABLE -->"


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


def load_marketplace() -> dict:
    """Load marketplace.json and return parsed structure."""
    if not MARKETPLACE_PATH.exists():
        raise FileNotFoundError(f"marketplace.json not found at {MARKETPLACE_PATH}")
    return json.loads(MARKETPLACE_PATH.read_text(encoding="utf-8"))


def generate_readme_table(skills: list[dict[str, str]]) -> str:
    """Generate the skills table for README.md using marketplace.json names."""
    marketplace = load_marketplace()
    plugins = {p["source"]: p for p in marketplace.get("plugins", [])}

    lines = [
        "| Name | Description | Documentation |",
        "|------|-------------|---------------|",
    ]

    for skill in skills:
        source = f"./{skill['path']}"
        plugin = plugins.get(source, {})
        name = plugin.get("name", skill["name"])
        description = plugin.get("description", skill["description"])
        doc_link = f"[SKILL.md]({skill['path']}/SKILL.md)"
        lines.append(f"| `{name}` | {description} | {doc_link} |")

    return "\n".join(lines)


def update_readme(skills: list[dict[str, str]]) -> bool:
    """
    Update the README.md skills table between markers.
    Returns True if the file was updated, False if markers not found.
    """
    if not README_PATH.exists():
        print(f"Warning: README.md not found at {README_PATH}", file=sys.stderr)
        return False

    content = README_PATH.read_text(encoding="utf-8")

    start_idx = content.find(README_TABLE_START)
    end_idx = content.find(README_TABLE_END)

    if start_idx == -1 or end_idx == -1:
        print(
            f"Warning: README.md markers not found. Add {README_TABLE_START} and "
            f"{README_TABLE_END} to enable table generation.",
            file=sys.stderr,
        )
        return False

    if end_idx < start_idx:
        print("Warning: README.md markers are in wrong order.", file=sys.stderr)
        return False

    table = generate_readme_table(skills)
    new_content = (
        content[: start_idx + len(README_TABLE_START)]
        + "\n"
        + table
        + "\n"
        + content[end_idx:]
    )

    README_PATH.write_text(new_content, encoding="utf-8")
    return True


def validate_marketplace(skills: list[dict[str, str]]) -> list[str]:
    """
    Validate marketplace.json against discovered skills.
    Returns list of error messages (empty = passed).
    """
    errors: list[str] = []
    marketplace = load_marketplace()
    plugins = marketplace.get("plugins", [])

    # Build lookups (normalize paths: skill uses "skills/x", marketplace uses "./skills/x")
    skill_by_source = {f"./{s['path']}": s for s in skills}
    plugin_by_source = {p["source"]: p for p in plugins}

    # Check: every skill has a marketplace entry with matching name
    for skill in skills:
        expected_source = f"./{skill['path']}"
        if expected_source not in plugin_by_source:
            errors.append(
                f"Skill '{skill['name']}' at '{skill['path']}' is missing from marketplace.json"
            )
        elif plugin_by_source[expected_source]["name"] != skill["name"]:
            errors.append(
                f"Name mismatch at '{expected_source}': "
                f"SKILL.md='{skill['name']}', marketplace.json='{plugin_by_source[expected_source]['name']}'"
            )

    # Check: every marketplace plugin with skills has a corresponding skill
    for plugin in plugins:
        # Skip plugins that don't have skills (e.g., commands-only plugins)
        if "skills" not in plugin:
            continue
        if plugin["source"] not in skill_by_source:
            errors.append(
                f"Marketplace plugin '{plugin['name']}' at '{plugin['source']}' has no SKILL.md"
            )

    return errors


def parse_version(version: str) -> tuple[int, int, int]:
    """Parse semver string to tuple."""
    match = re.match(r"(\d+)\.(\d+)\.(\d+)", version)
    if not match:
        return (1, 0, 0)
    return (int(match.group(1)), int(match.group(2)), int(match.group(3)))


def format_version(version: tuple[int, int, int]) -> str:
    """Format version tuple to string."""
    return f"{version[0]}.{version[1]}.{version[2]}"


def get_bump_type(commit_msg: str) -> str:
    """
    Determine version bump type from conventional commit message.
    Returns: 'major', 'minor', 'patch', or 'none'
    """
    msg_lower = commit_msg.lower()

    # Major: BREAKING CHANGE or ! after type
    if "breaking change" in msg_lower or re.match(r"^\w+!:", commit_msg):
        return "major"

    # Minor: feat
    if re.match(r"^feat(\(.+\))?:", commit_msg, re.IGNORECASE):
        return "minor"

    # Patch: fix, docs, chore, refactor, style, test, perf, ci, build
    patch_types = ["fix", "docs", "chore", "refactor", "style", "test", "perf", "ci", "build"]
    for t in patch_types:
        if re.match(rf"^{t}(\(.+\))?:", commit_msg, re.IGNORECASE):
            return "patch"

    return "none"


def bump_version(version: str, bump_type: str) -> str:
    """Bump version based on type."""
    major, minor, patch = parse_version(version)

    if bump_type == "major":
        return format_version((major + 1, 0, 0))
    elif bump_type == "minor":
        return format_version((major, minor + 1, 0))
    elif bump_type == "patch":
        return format_version((major, minor, patch + 1))
    return version


def update_user_agent_in_skill(skill_name: str, new_version: str) -> bool:
    """
    Update USER_AGENT version in skill's run_actor.py script.
    Returns True if updated, False otherwise.
    """
    script_path = SKILLS_DIR / skill_name / "reference" / "scripts" / "run_actor.py"
    if not script_path.exists():
        return False

    content = script_path.read_text(encoding="utf-8")

    # Pattern: USER_AGENT = "bycrawl-agent-skills/skill-name-X.Y.Z"
    pattern = rf'(USER_AGENT\s*=\s*"bycrawl-agent-skills/{re.escape(skill_name)}-)\d+\.\d+\.\d+"'
    replacement = rf'\g<1>{new_version}"'

    new_content, count = re.subn(pattern, replacement, content)

    if count > 0:
        script_path.write_text(new_content, encoding="utf-8")
        print(f"Updated USER_AGENT in {script_path.relative_to(ROOT)}: {new_version}")
        return True

    return False


def get_changed_skills() -> set[str]:
    """Get list of skill names that have staged changes."""
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True,
            text=True,
            cwd=ROOT,
        )
        changed_files = result.stdout.strip().split("\n") if result.stdout.strip() else []
    except Exception:
        return set()

    changed_skills = set()
    for f in changed_files:
        # Match skills/skill-name/... pattern
        match = re.match(r"skills/([^/]+)/", f)
        if match:
            changed_skills.add(match.group(1))

    return changed_skills


def update_versions(commit_msg: str) -> bool:
    """
    Update versions based on commit message and changed files.
    Returns True if any version was bumped.
    """
    bump_type = get_bump_type(commit_msg)
    if bump_type == "none":
        print(f"No version bump needed for commit: {commit_msg[:50]}...")
        return False

    changed_skills = get_changed_skills()
    bumped = False

    # Load marketplace.json
    marketplace = load_marketplace()

    # Bump individual skill versions if they changed
    for plugin in marketplace.get("plugins", []):
        skill_name = plugin["source"].replace("./skills/", "")
        if skill_name in changed_skills:
            old_version = plugin.get("version", "1.0.0")
            new_version = bump_version(old_version, bump_type)
            if old_version != new_version:
                plugin["version"] = new_version
                print(f"Bumped {skill_name}: {old_version} → {new_version} ({bump_type})")
                bumped = True
                # Also update USER_AGENT in skill's run_actor.py
                update_user_agent_in_skill(skill_name, new_version)

    # Bump marketplace version if any skill changed
    if changed_skills or bumped:
        old_version = marketplace.get("metadata", {}).get("version", "1.0.0")
        new_version = bump_version(old_version, bump_type)
        if old_version != new_version:
            if "metadata" not in marketplace:
                marketplace["metadata"] = {}
            marketplace["metadata"]["version"] = new_version
            print(f"Bumped marketplace: {old_version} → {new_version} ({bump_type})")
            bumped = True

    # Save marketplace.json
    if bumped:
        MARKETPLACE_PATH.write_text(
            json.dumps(marketplace, indent=2) + "\n",
            encoding="utf-8"
        )

    # Also bump plugin.json version
    if bumped and PLUGIN_PATH.exists():
        plugin_data = json.loads(PLUGIN_PATH.read_text(encoding="utf-8"))
        old_version = plugin_data.get("version", "1.0.0")
        new_version = bump_version(old_version, bump_type)
        if old_version != new_version:
            plugin_data["version"] = new_version
            PLUGIN_PATH.write_text(
                json.dumps(plugin_data, indent=2) + "\n",
                encoding="utf-8"
            )
            print(f"Bumped plugin.json: {old_version} → {new_version}")

    return bumped


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate AGENTS.md and manage versions")
    parser.add_argument(
        "--bump",
        metavar="COMMIT_MSG",
        help="Bump versions based on conventional commit message"
    )
    args = parser.parse_args()

    # Handle version bumping if requested
    if args.bump:
        update_versions(args.bump)

    template = load_template()
    skills = collect_skills()
    output = render(template, skills)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(output, encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} with {len(skills)} skills.")

    # Validate marketplace.json
    errors = validate_marketplace(skills)
    if errors:
        print("\nMarketplace.json validation errors:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)
    print("Marketplace.json validation passed.")

    # Update README.md skills table
    if update_readme(skills):
        print(f"Updated {README_PATH} skills table.")


if __name__ == "__main__":
    main()