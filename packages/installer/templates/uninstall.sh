#!/bin/bash

# @import "./find-home.sh"
# @import "./find-window-html.sh"
# @import "./find-userdata.sh"

escape_for_sed() {
  echo "$1" | sed -E 's/[]\/$*.^|[]/\\&/g'
}

plugin_script="<script src=\"$userdata_url/plugins/loader.js\" type=\"module\"></script>"

# Compare against the raw tag; the escaped form is only for sed.
if [[ "$html" == *"$plugin_script"* ]]; then
  echo "Editing File: $html_path"

  # Remove script (every copy, in case an older installer inserted it more than once)
  new_html=$(echo "$html" | sed "s|$(escape_for_sed "$plugin_script")||g")

  # Update html
  echo "$new_html" > "$html_path"
fi

# Remove files
plugin_path="$userdata_path/plugins"
if [[ -d "$plugin_path" ]]; then
  echo "Removing plugin files in \"$plugin_path\"..."
  rm -r "$plugin_path"
fi

echo "Successfully uninstalled Typora Community Plugin."
