#!/usr/bin/env bash
# Create the repository's local tags on the remote using the GitHub API.
#
# Why not `git push --tags`: this workflow file publishes on any `v*` tag, so
# pushing 149 historical tags would fire 149 image builds and chart pushes at
# GHCR. Refs created through the API do not trigger workflows, so the history
# arrives without a publish storm.
#
# The tags are worth having because `gh release create --generate-notes` (and
# GitHub's release notes UI) needs an earlier tag to diff against; without one
# every release body is just a "Full Changelog" link.
#
# Usage:
#   hack/release/backfill-tags.sh            # show what would be created
#   hack/release/backfill-tags.sh --apply    # create the refs
set -euo pipefail

apply=false
if [[ "${1:-}" == "--apply" ]]; then
  apply=true
fi

repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
remote_tags=$(git ls-remote --tags origin | sed 's|.*refs/tags/||; s|\^{}||' | sort -u)

created=0
skipped=0

while read -r tag object peeled; do
  commit="${peeled:-$object}"

  if grep -qxF "$tag" <<< "$remote_tags"; then
    skipped=$((skipped + 1))
    continue
  fi

  if [[ "$apply" == true ]]; then
    echo "creating $tag -> ${commit:0:9}"
    gh api --method POST "repos/$repo/git/refs" \
      -f "ref=refs/tags/$tag" -f "sha=$commit" > /dev/null
  else
    echo "would create $tag -> ${commit:0:9}"
  fi
  created=$((created + 1))
done < <(git for-each-ref --format='%(refname:short) %(objectname) %(*objectname)' refs/tags)

echo
if [[ "$apply" == true ]]; then
  echo "created $created tag(s), $skipped already on $repo"
else
  echo "would create $created tag(s), $skipped already on $repo"
  echo "re-run with --apply to create them"
fi
