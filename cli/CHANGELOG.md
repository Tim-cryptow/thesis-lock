# Changelog

All notable changes to the ThesisLock CLI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-26

### Added

- `verify` command to check whether a SHA-256 hash is anchored in any ThesisLock
  contract (single, batch, registry, proof NFT, or group), with `--owner` for
  owner-keyed batch anchors.
- `hash` command to compute the SHA-256 digest of one or more files, with
  `--verify` to check each digest on chain in the same step.
- `status` command for protocol health, contract list, and latest block, or a
  wallet's anchor count when a principal is given.
- `search` command to find anchors by hash, principal, or label substring, with
  `--limit` to cap the number of results.
- `batch` command to hash every file in a directory, with `--recursive`,
  `--exclude` glob patterns, and `--verify`.
- `--json` flag on every command for machine-readable output, and `--quiet` flag
  for a single essential value, both designed for scripting and CI pipelines.
- Bash and zsh shell completion scripts in `completions/`.
- `THESISLOCK_API_URL` environment variable to point reads at a custom Hiro
  endpoint.

[0.1.0]: https://github.com/Tim-cryptow/thesis-lock/releases/tag/cli-v0.1.0
