#!/usr/bin/env python3
"""Tests for hack/release/version.py.

Run with: python3 -m unittest discover -s hack/release -p 'test_*.py'
"""

import json
import unittest

import version

CHART = """\
apiVersion: v2
name: weave-gitops
version: 0.40.0
appVersion: "v0.40.0"
"""

PACKAGE = json.dumps(
    {"name": "@zazathomas/weave-gitops", "version": "0.40.0", "scripts": {"a": "b"}},
    indent=2,
) + "\n"


class ParseTest(unittest.TestCase):
    def test_parses_plain_and_prerelease(self):
        self.assertEqual(version.parse("1.2.3"), (1, 2, 3, ""))
        self.assertEqual(version.parse("0.39.1-rc.1"), (0, 39, 1, "rc.1"))

    def test_rejects_nonsense(self):
        for bad in ("0.40", "latest", "v", "0.40.0.1", ""):
            with self.assertRaises(version.VersionError):
                version.parse(bad)


class NextVersionTest(unittest.TestCase):
    def test_bumps(self):
        self.assertEqual(version.next_version("0.40.0", "patch"), "0.40.1")
        self.assertEqual(version.next_version("0.40.0", "minor"), "0.41.0")
        self.assertEqual(version.next_version("0.40.0", "major"), "1.0.0")

    def test_drops_prerelease_before_bumping(self):
        # 0.39.1-rc.1 released as a minor bump is 0.40.0, which is how v0.40.0
        # was cut.
        self.assertEqual(version.next_version("0.39.1-rc.1", "minor"), "0.40.0")
        self.assertEqual(version.next_version("0.39.1-rc.1", "patch"), "0.39.2")

    def test_explicit_version_wins(self):
        self.assertEqual(version.next_version("0.40.0", "patch", "0.50.0"), "0.50.0")
        self.assertEqual(version.next_version("0.40.0", "minor", "v0.40.0"), "0.40.0")

    def test_explicit_version_must_be_semver(self):
        with self.assertRaises(version.VersionError):
            version.next_version("0.40.0", "patch", "next")

    def test_unknown_bump(self):
        with self.assertRaises(version.VersionError):
            version.next_version("0.40.0", "huge")


class ApplyTest(unittest.TestCase):
    def test_writes_both_files(self):
        new_chart, new_package = version.apply("0.41.0", CHART, PACKAGE)
        self.assertEqual(version.chart_version(new_chart), "0.41.0")
        self.assertEqual(version.chart_app_version(new_chart), "0.41.0")
        self.assertEqual(version.package_version(new_package), "0.41.0")

    def test_keeps_other_package_fields_and_ordering(self):
        _, new_package = version.apply("0.41.0", CHART, PACKAGE)
        parsed = json.loads(new_package)
        self.assertEqual(parsed["scripts"], {"a": "b"})
        self.assertEqual(list(parsed), ["name", "version", "scripts"])
        self.assertTrue(new_package.endswith("\n"))

    def test_is_idempotent(self):
        chart_once, package_once = version.apply("0.41.0", CHART, PACKAGE)
        chart_twice, package_twice = version.apply("0.41.0", chart_once, package_once)
        self.assertEqual(chart_once, chart_twice)
        self.assertEqual(package_once, package_twice)

    def test_round_trips_the_real_files(self):
        package = json.loads(PACKAGE)
        rewritten = json.dumps(package, indent=2) + "\n"
        self.assertEqual(rewritten, PACKAGE)

    def test_rejects_nonsense(self):
        with self.assertRaises(version.VersionError):
            version.apply("not-a-version", CHART, PACKAGE)


class CheckTest(unittest.TestCase):
    def test_consistent_files_pass(self):
        self.assertEqual(version.check(CHART, PACKAGE), [])

    def test_matching_tag_passes(self):
        self.assertEqual(version.check(CHART, PACKAGE, "v0.40.0"), [])

    def test_mismatched_tag_fails(self):
        problems = version.check(CHART, PACKAGE, "v0.39.0")
        self.assertEqual(len(problems), 1)
        self.assertIn("v0.39.0", problems[0])

    def test_branch_ref_is_ignored(self):
        # ci.yaml passes an empty tag on branch builds; refs are never compared
        self.assertEqual(version.check(CHART, PACKAGE, ""), [])

    def test_drift_between_files_is_reported(self):
        drifted = PACKAGE.replace('"version": "0.40.0"', '"version": "0.39.0"')
        problems = version.check(CHART, drifted)
        self.assertEqual(len(problems), 1)
        self.assertIn("package.json", problems[0])

    def test_drift_between_version_and_app_version_is_reported(self):
        drifted = CHART.replace('appVersion: "v0.40.0"', 'appVersion: "v0.39.0"')
        problems = version.check(drifted, PACKAGE)
        self.assertEqual(len(problems), 1)
        self.assertIn("appVersion", problems[0])

    def test_reports_every_problem_at_once(self):
        chart = CHART.replace("version: 0.40.0", "version: 0.41.0").replace(
            'appVersion: "v0.40.0"', 'appVersion: "v0.39.0"'
        )
        problems = version.check(chart, PACKAGE, "v0.42.0")
        self.assertEqual(len(problems), 3)


if __name__ == "__main__":
    unittest.main()
