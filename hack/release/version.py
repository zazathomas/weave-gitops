#!/usr/bin/env python3
"""Release version arithmetic for the chart and the npm package.

This logic used to live in heredocs inside .github/workflows/release.yaml,
where it could not be tested and had no way to be checked against the files it
edits. Keeping it here means the bump rules are covered by
hack/release/test_version.py, which CI runs on every change.

Subcommands:

    next   print the version a bump would produce
    apply  write a version into charts/weave-gitops/Chart.yaml and package.json
    check  report any disagreement between the version files and a git tag
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

CHART = Path("charts/weave-gitops/Chart.yaml")
PACKAGE = Path("package.json")

SEMVER = re.compile(r"(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?\Z")
CHART_VERSION = re.compile(r"^version:\s*(\S+)\s*$", re.MULTILINE)
CHART_APP_VERSION = re.compile(r"^appVersion:\s*\"?([^\"\s]+)\"?\s*$", re.MULTILINE)


class VersionError(Exception):
    pass


def parse(version: str) -> tuple[int, int, int, str]:
    """Split a semantic version into (major, minor, patch, prerelease)."""
    match = SEMVER.match(version.strip())
    if not match:
        raise VersionError(f"not a semantic version: {version!r}")
    major, minor, patch, prerelease = match.groups()
    return int(major), int(minor), int(patch), prerelease or ""


def next_version(current: str, bump: str = "patch", explicit: str = "") -> str:
    """Return the version a release should carry.

    An explicit version wins over the bump. Prerelease suffixes are dropped
    before bumping, so 0.39.1-rc.1 with a minor bump releases 0.40.0.
    """
    explicit = explicit.strip().lstrip("v")
    if explicit:
        parse(explicit)  # reject nonsense before it reaches a tag
        return explicit

    major, minor, patch, _ = parse(current)

    if bump == "major":
        return f"{major + 1}.0.0"
    if bump == "minor":
        return f"{major}.{minor + 1}.0"
    if bump == "patch":
        return f"{major}.{minor}.{patch + 1}"

    raise VersionError(f"unknown bump: {bump!r} (expected major, minor or patch)")


def chart_version(chart: str) -> str:
    match = CHART_VERSION.search(chart)
    if not match:
        raise VersionError("no version: field in Chart.yaml")
    return match.group(1)


def chart_app_version(chart: str) -> str:
    match = CHART_APP_VERSION.search(chart)
    if not match:
        raise VersionError("no appVersion: field in Chart.yaml")
    return match.group(1).lstrip("v")


def package_version(package: str) -> str:
    try:
        return json.loads(package)["version"]
    except (KeyError, json.JSONDecodeError) as err:
        raise VersionError(f"package.json has no usable version: {err}") from err


def apply(version: str, chart: str, package: str) -> tuple[str, str]:
    """Return Chart.yaml and package.json with the version applied."""
    parse(version)  # never write something a tag cannot carry

    new_chart, versioned = re.subn(
        r"^version: .*$", f"version: {version}", chart, count=1, flags=re.MULTILINE
    )
    if not versioned:
        raise VersionError("no version: field in Chart.yaml")

    new_chart, app_versioned = re.subn(
        r"^appVersion: .*$",
        f'appVersion: "v{version}"',
        new_chart,
        count=1,
        flags=re.MULTILINE,
    )
    if not app_versioned:
        raise VersionError("no appVersion: field in Chart.yaml")

    raw = json.loads(package)
    raw["version"] = version
    return new_chart, json.dumps(raw, indent=2) + "\n"


def check(chart: str, package: str, tag: str = "") -> list[str]:
    """Report every disagreement between the version files and the tag."""
    problems = []

    version = chart_version(chart)
    app_version = chart_app_version(chart)
    pkg_version = package_version(package)

    if app_version != version:
        problems.append(f"Chart.yaml appVersion {app_version} != version {version}")
    if pkg_version != version:
        problems.append(
            f"package.json version {pkg_version} != Chart.yaml version {version}"
        )

    tag = tag.strip().lstrip("v")
    if tag and tag != version:
        problems.append(f"tag v{tag} != Chart.yaml version {version}")

    return problems


def _read(paths: tuple[Path, Path] = (CHART, PACKAGE)) -> tuple[str, str]:
    chart_path, package_path = paths
    return chart_path.read_text(), package_path.read_text()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    next_cmd = sub.add_parser("next", help="print the next version")
    next_cmd.add_argument("--bump", default="patch", choices=["patch", "minor", "major"])
    next_cmd.add_argument("--explicit", default="", help="explicit version, overrides --bump")
    next_cmd.add_argument("--current", default="", help="current version (default: Chart.yaml)")

    apply_cmd = sub.add_parser("apply", help="write the version into the version files")
    apply_cmd.add_argument("--version", required=True)

    check_cmd = sub.add_parser("check", help="check the version files agree")
    check_cmd.add_argument("--tag", default="", help="tag to compare against, e.g. v0.40.0")

    args = parser.parse_args(argv)

    try:
        if args.command == "next":
            chart, _ = _read()
            current = args.current or chart_version(chart)
            print(next_version(current, args.bump, args.explicit))
        elif args.command == "apply":
            chart, package = _read()
            new_chart, new_package = apply(args.version, chart, package)
            CHART.write_text(new_chart)
            PACKAGE.write_text(new_package)
        else:
            chart, package = _read()
            problems = check(chart, package, args.tag)
            for problem in problems:
                print(f"version mismatch: {problem}", file=sys.stderr)
            return 1 if problems else 0
    except VersionError as err:
        print(f"error: {err}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
