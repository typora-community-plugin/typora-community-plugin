html_path=''

window_html_path_candidates=(
    # LINUX_START
    "$typora_home/resources/app/window.html"
    "$typora_home/resources/appsrc/window.html"
    "$typora_home/resources/window.html"
    # LINUX_END

    # MACOS_START
    "$typora_home/Contents/Resources/TypeMark/index.html"
    "$typora_home/Contents/Resources/app/index.html"
    "$typora_home/Contents/Resources/appsrc/index.html"
    "$typora_home/resources/app/index.html"
    "$typora_home/resources/appsrc/index.html"
    "$typora_home/resources/TypeMark/index.html"
    "$typora_home/resources/index.html"
    # MACOS_END
)

for window_html_path in "${window_html_path_candidates[@]}"; do
  if [[ -e "$window_html_path" ]]; then
    html_path="$window_html_path"
    break
  fi
done

if [[ -e "$html_path" ]]; then
  echo "index.html path: $html_path"
else
  echo 'Can not find `window.html`.'
  exit 1
fi
