#!/usr/bin/env bash
set -euo pipefail

CLARINET_VERSION="3.2.0"

echo "Installing Clarinet v${CLARINET_VERSION}"
TMP="$(mktemp -d)"
cd "$TMP"
curl -fsSL "https://github.com/hirosystems/clarinet/releases/download/v${CLARINET_VERSION}/clarinet-linux-x64-glibc.tar.gz" -o clarinet.tar.gz
tar -xzf clarinet.tar.gz
sudo install -m 0755 clarinet /usr/local/bin/clarinet
cd -
rm -rf "$TMP"

echo "Disabling Clarinet telemetry"
mkdir -p "$HOME/.clarinet"
echo "enable_telemetry = false" > "$HOME/.clarinet/clarinetrc.toml"

echo "Installing Claude Code and Vercel CLI globally"
sudo npm install -g @anthropic-ai/claude-code vercel

echo "Verifying installs"
clarinet --version
claude --version
vercel --version

echo "Devcontainer install complete"
