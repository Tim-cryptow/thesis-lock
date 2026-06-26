#compdef thesislock
#
# Zsh completion for the thesislock CLI.
#
# Install:
#   mkdir -p ~/.zsh/completions
#   cp thesislock.zsh ~/.zsh/completions/_thesislock
#   # then in ~/.zshrc, before compinit:
#   fpath=(~/.zsh/completions $fpath)
#   autoload -U compinit && compinit

_thesislock() {
  local context state line
  typeset -A opt_args

  local -a commands
  commands=(
    'verify:Check whether a SHA-256 hash is anchored on Stacks'
    'hash:Compute the SHA-256 hash of one or more files'
    'status:Show protocol status or wallet anchor stats'
    'search:Search anchors by hash, principal, or label'
    'batch:Hash every file in a directory'
  )

  _arguments -C \
    '1: :->command' \
    '*:: :->args'

  case $state in
    command)
      _describe -t commands 'thesislock command' commands
      ;;
    args)
      case $line[1] in
        verify)
          _arguments \
            '--owner[Stacks principal for owner-keyed batch anchors]:principal:' \
            '--json[print machine-readable JSON output]' \
            '--quiet[print only true or false]'
          ;;
        hash)
          _arguments \
            '--verify[also check whether each hash is anchored]' \
            '--json[print machine-readable JSON output]' \
            '--quiet[print only the hash for each file]' \
            '*:file:_files'
          ;;
        status)
          _arguments \
            '--json[print machine-readable JSON output]' \
            '--quiet[print only the health state or anchor count]'
          ;;
        search)
          _arguments \
            '--json[print machine-readable JSON output]' \
            '--quiet[print only one matching hash per line]' \
            '--limit[maximum number of results to show]:count:'
          ;;
        batch)
          _arguments \
            '--verify[also check whether each hash is anchored]' \
            '--recursive[descend into subdirectories]' \
            '--exclude[comma-separated glob patterns to skip]:patterns:' \
            '--json[print machine-readable JSON output]' \
            '--quiet[print only the hash for each file]' \
            '1:directory:_files -/'
          ;;
      esac
      ;;
  esac
}

_thesislock "$@"
