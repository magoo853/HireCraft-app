#!/bin/sh
# Vercel ignoreCommand for HireCraft-app (see COORDINATION.md "Build behavior").
#
# Vercel semantics: exit 0 = SKIP the build, exit 1 = BUILD.
# Rule: skip ONLY when every file changed by this deployment is documentation
# (any *.md file, or anything under docs/). Anything else builds.
# Fail-safe: empty/unknown diff, missing git data, or any error -> BUILD.
# No `set -e`/`set -u` on purpose: every failure path must end at exit 1,
# never at an accidental exit 0.

changed=""
have_list=0

# Preferred source: diff the deployment's commit range.
if [ -n "${VERCEL_GIT_PREVIOUS_SHA:-}" ] && git cat-file -e "${VERCEL_GIT_PREVIOUS_SHA}^{commit}" 2>/dev/null; then
  if changed=$(git diff --name-only "${VERCEL_GIT_PREVIOUS_SHA}" HEAD 2>/dev/null); then
    have_list=1
  fi
fi

# Fallback: files touched by HEAD alone (first deploy, bogus previous SHA, ...).
if [ "${have_list}" -eq 0 ]; then
  changed=$(git diff-tree --root --no-commit-id --name-only -r HEAD 2>/dev/null) || \
  changed=$(git show --pretty=format: --name-only HEAD 2>/dev/null) || \
  changed=""
fi

# Empty or unknown diff -> build.
if [ -z "${changed}" ]; then
  exit 1
fi

# Count changed files that are NOT documentation.
nondoc=$(printf '%s\n' "${changed}" | grep -c -v -E '\.md$|^docs/')

case "${nondoc}" in
  0)
    # Every changed file is a doc -> skip the build.
    exit 0
    ;;
  ''|*[!0-9]*)
    # Could not count reliably -> build.
    exit 1
    ;;
  *)
    # At least one non-doc file changed -> build.
    exit 1
    ;;
esac
