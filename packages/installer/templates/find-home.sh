typora_home=''

# use arguments `-path` or `-p`
while [[ "$#" -gt 0 ]]; do
  case $1 in
  -p | --path)
    typora_home="$2"
    shift
    ;;
  *)
    echo "Unknown parameter passed: $1"
    exit 1
    ;;
  esac
  shift
done

# use Candidates
if [[ ! -e "$typora_home" ]]; then
  paths=(
    # LINUX_START
    "/usr/share/typora"
    "/usr/local/share/typora"
    "/opt/typora"
    "/opt/Typora"
    "$HOME/.local/share/Typora"
    "$HOME/.local/share/typora"
    # LINUX_END

    # MACOS_START
    "/Applications/Typora.app"
    "$HOME/Applications/Typora.app"
    "/usr/local/bin/Typora"
    "/opt/Typora"
    # MACOS_END
  )

  for path in "${paths[@]}"; do [ -d "$path" ] && typora_home="$path" && break; done
fi

if [[ -e "$typora_home" ]]; then
  echo "Typora Home: $typora_home"
else
  echo 'Can not find Typora home directory.'
  exit 1
fi
