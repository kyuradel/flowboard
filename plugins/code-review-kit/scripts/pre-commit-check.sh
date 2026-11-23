#!/bin/bash
# PreToolUse hook: only acts on Bash calls that look like `git commit`.
# Runs lint/build/test (whichever npm scripts actually exist) and blocks
# the commit (exit 2) if any of them fail. No-ops cleanly if there's no
# package.json yet or none of the scripts are defined.

input="$(cat)"

case "$input" in
  *'git commit'*) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if [ ! -f package.json ]; then
  exit 0
fi

run_script() {
  local name="$1"
  if grep -q "\"$name\"[[:space:]]*:" package.json; then
    echo "pre-commit: running npm run $name" >&2
    npm run --silent "$name"
    return $?
  fi
  return 0
}

fail=0
run_script lint || fail=1
run_script build || fail=1
run_script test || fail=1

if [ "$fail" -ne 0 ]; then
  echo "pre-commit: lint/build/test failed — fix the issue above and commit again." >&2
  exit 2
fi

exit 0
