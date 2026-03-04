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
PLUGINS_DIR = ROOT / "plugins"

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
    for skill_md in ROOT.glob("plugins/*/skills/*/SKILL.md"):
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
    plugins = {p["name"]: p for p in marketplace.get("plugins", [])}

    lines = [
        "| Name | Description | Documentation |",
        "|------|-------------|---------------|",
    ]

    # Group skills by plugin
    for plugin_name, plugin in plugins.items():
        description = plugin.get("description", "")
        # Find the first skill in this plugin for the doc link
        plugin_source = plugin.get("source", "")
        plugin_skills = [s for s in skills if s["path"].startswith(plugin_source.lstrip("./"))]
        if plugin_skills:
            doc_link = f"[SKILL.md]({plugin_skills[0]['path']}/SKILL.md)"
        else:
            doc_link = ""
        lines.append(f"| `{plugin_name}` | {description} | {doc_link} |")

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

    # Build lookup: plugin source -> list of skill paths under it
    plugin_by_name = {p["name"]: p for p in plugins}

    # Check: every marketplace plugin with skills has at least one SKILL.md
    for plugin in plugins:
        if "skills" not in plugin:
            continue
        source = plugin["source"].lstrip("./")
        plugin_skills = [s for s in skills if s["path"].startswith(source + "/")]
        if not plugin_skills:
            errors.append(
                f"Marketplace plugin '{plugin['name']}' at '{plugin['source']}' has no SKILL.md files"
            )

    # Check: every discovered skill is covered by a marketplace plugin
    for skill in skills:
        found = False
        for plugin in plugins:
            if "skills" not in plugin:
                continue
            source = plugin["source"].lstrip("./")
            if skill["path"].startswith(source + "/"):
                found = True
                break
        if not found:
            errors.append(
                f"Skill '{skill['name']}' at '{skill['path']}' is not covered by any marketplace plugin"
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


def update_user_agent_in_plugin(plugin_name: str, new_version: str) -> bool:
    """
    Update USER_AGENT version in plugin's run_actor.js script.
    Returns True if updated, False otherwise.
    """
    script_path = PLUGINS_DIR / plugin_name / "scripts" / "run_actor.js"
    if not script_path.exists():
        return False

    content = script_path.read_text(encoding="utf-8")

    # Pattern: USER_AGENT = "apify-agent-skills/plugin-name-X.Y.Z"
    pattern = rf'(USER_AGENT\s*=\s*["\']apify-agent-skills/{re.escape(plugin_name)}-)\d+\.\d+\.\d+(["\'])'
    replacement = rf'\g<1>{new_version}\2'

    new_content, count = re.subn(pattern, replacement, content)

    if count > 0:
        script_path.write_text(new_content, encoding="utf-8")
        print(f"Updated USER_AGENT in {script_path.relative_to(ROOT)}: {new_version}")
        return True

    return False


def update_per_plugin_json(plugin_name: str, new_version: str) -> None:
    """Update version in per-plugin .claude-plugin/plugin.json and .cursor-plugin/plugin.json."""
    for platform_dir in [".claude-plugin", ".cursor-plugin"]:
        json_path = PLUGINS_DIR / plugin_name / platform_dir / "plugin.json"
        if not json_path.exists():
            continue
        data = json.loads(json_path.read_text(encoding="utf-8"))
        old_version = data.get("version", "1.0.0")
        if old_version != new_version:
            data["version"] = new_version
            json_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
            print(f"Bumped {json_path.relative_to(ROOT)}: {old_version} → {new_version}")


def get_changed_plugins() -> set[str]:
    """Get list of plugin names that have staged changes."""
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

    changed_plugins = set()
    for f in changed_files:
        # Match plugins/plugin-name/... pattern
        match = re.match(r"plugins/([^/]+)/", f)
        if match:
            changed_plugins.add(match.group(1))

    return changed_plugins


def update_cursor_marketplace_version(new_version: str) -> None:
    """Update version in .cursor-plugin/marketplace.json."""
    cursor_marketplace = ROOT / ".cursor-plugin" / "marketplace.json"
    if not cursor_marketplace.exists():
        return
    data = json.loads(cursor_marketplace.read_text(encoding="utf-8"))
    if "metadata" in data:
        old_version = data["metadata"].get("version", "1.0.0")
        if old_version != new_version:
            data["metadata"]["version"] = new_version
            cursor_marketplace.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
            print(f"Bumped .cursor-plugin/marketplace.json: {old_version} → {new_version}")


def update_versions(commit_msg: str) -> bool:
    """
    Update versions based on commit message and changed files.
    Returns True if any version was bumped.
    """
    bump_type = get_bump_type(commit_msg)
    if bump_type == "none":
        print(f"No version bump needed for commit: {commit_msg[:50]}...")
        return False

    changed_plugins = get_changed_plugins()
    bumped = False

    # Load marketplace.json
    marketplace = load_marketplace()

    # Bump individual plugin versions if they changed
    for plugin in marketplace.get("plugins", []):
        plugin_name = plugin["name"]
        # Check if this plugin has changes
        if plugin_name in changed_plugins:
            old_version = plugin.get("version", "1.0.0")
            new_version = bump_version(old_version, bump_type)
            if old_version != new_version:
                plugin["version"] = new_version
                print(f"Bumped {plugin_name}: {old_version} → {new_version} ({bump_type})")
                bumped = True
                # Also update USER_AGENT in plugin's run_actor.js
                update_user_agent_in_plugin(plugin_name, new_version)
                # Also update per-plugin JSON files
                update_per_plugin_json(plugin_name, new_version)

    # Bump marketplace version if any plugin changed
    if changed_plugins or bumped:
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

    # Also bump .cursor-plugin/marketplace.json version
    if bumped:
        new_marketplace_version = marketplace.get("metadata", {}).get("version", "2.0.0")
        update_cursor_marketplace_version(new_marketplace_version)

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
