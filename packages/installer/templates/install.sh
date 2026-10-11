#!/bin/bash

# @import "./find-home.sh"
# @import "./find-window-html.sh"
# @import "./find-userdata.sh"

escape_for_sed() {
  echo "$1" | sed -E 's/[]\/$*.^|[]/\\&/g'
}

plugin_script="<script src=\"$userdata_url/plugins/loader.js\" type=\"module\"></script>"

# Compare against the raw tag; the escaped form is only for sed.
if [[ ! "$html" == *"$plugin_script"* ]]; then
  echo "Editing File: $html_path"

  # Insert script
  new_html=$(echo "$html" | sed "s|</body>|$(escape_for_sed "$plugin_script")</body>|")

  # Update html
  echo "$new_html" > "$html_path"
fi

# Copy files (always, so re-running the installer also upgrades an existing install)
plugin_path="$userdata_path/plugins"
script_dir="$(cd "$(dirname "$0")" && pwd)"
if [[ "$script_dir" != "$plugin_path" ]]; then
  echo "Copying plugin files to \"$plugin_path\"..."
  mkdir -p "$plugin_path"
  cp -R "$script_dir/." "$plugin_path"
fi

echo "Successfully installed Typora Community Plugin."
