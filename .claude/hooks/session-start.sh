#!/usr/bin/env bash
set -euo pipefail

# Session startup hook for the remote web environment.
#
# Prepares the ephemeral container at the start of each remote session so that
# commits are attributed to the maintainer and the web app's dependencies are
# installed. Guarded to the remote environment so it never overrides a
# contributor's own git config on a local clone.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# Attribute commits made during web sessions to the maintainer's noreply identity.
git config user.name "Tim-cryptow"
git config user.email "155663393+Tim-cryptow@users.noreply.github.com"

# Install web app dependencies. install (not ci) so the cached container reuses
# node_modules across sessions; idempotent and safe to re-run.
npm install --prefix web --no-audit --no-fund
