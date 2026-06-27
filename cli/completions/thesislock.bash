# Bash completion for the thesislock CLI.
#
# Install (pick one):
#   source /path/to/thesislock.bash    # from your ~/.bashrc
#   cp thesislock.bash /usr/share/bash-completion/completions/thesislock
#   cp thesislock.bash /etc/bash_completion.d/thesislock

_thesislock() {
  local cur prev
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD - 1]}"

  local commands="verify hash status search batch"
  local global_opts="--help --version"

  # Find the subcommand: the first non-option word after the program name.
  local cmd=""
  local i
  for ((i = 1; i < COMP_CWORD; i++)); do
    case "${COMP_WORDS[i]}" in
      -*) ;;
      *)
        cmd="${COMP_WORDS[i]}"
        break
        ;;
    esac
  done

  if [[ -z "$cmd" ]]; then
    COMPREPLY=($(compgen -W "$commands $global_opts" -- "$cur"))
    return 0
  fi

  local opts=""
  case "$cmd" in
    verify) opts="--owner --json --quiet --help" ;;
    hash) opts="--verify --json --quiet --help" ;;
    status) opts="--json --quiet --help" ;;
    search) opts="--json --quiet --limit --help" ;;
    batch) opts="--verify --recursive --exclude --json --quiet --help" ;;
  esac

  if [[ "$cur" == -* ]]; then
    COMPREPLY=($(compgen -W "$opts" -- "$cur"))
    return 0
  fi

  # hash completes file paths, batch completes directories.
  case "$cmd" in
    hash) COMPREPLY=($(compgen -f -- "$cur")) ;;
    batch) COMPREPLY=($(compgen -d -- "$cur")) ;;
    *) COMPREPLY=($(compgen -W "$opts" -- "$cur")) ;;
  esac
  return 0
}

complete -F _thesislock thesislock
