#!/bin/bash

# {{ FIND_TYPORA_HOME }}
# {{ FIND_WINDOW_HTML }}
# {{ FIND_USERDATA_DIR }}

escape_for_sed() {
  echo "$1" | sed -E 's/[]\/$*.^|[]/\\&/g'
}

plugin_script=$(escape_for_sed "<script src=\"$userdata_url/plugins/loader.js\" type=\"module\"></script>")

if [[ "$html" == *"$plugin_script"* ]]; then
  # Remove script
  new_html=$(echo "$html" | sed "s|$plugin_script||")

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
