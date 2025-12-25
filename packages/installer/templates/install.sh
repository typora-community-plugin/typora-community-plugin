#!/bin/bash

# {{ FIND_TYPORA_HOME }}
# {{ FIND_WINDOW_HTML }}
# {{ FIND_USERDATA_DIR }}

escape_for_sed() {
  echo "$1" | sed -E 's/[]\/$*.^|[]/\\&/g'
}

plugin_script=$(escape_for_sed "<script src=\"$userdata_url/plugins/loader.js\" type=\"module\"></script>")

if [[ ! "$html" == *"$plugin_script"* ]]; then
  # Insert script
  new_html=$(echo "$html" | sed "s|</body>|$plugin_script</body>|")

  # Update html
  echo "$new_html" > "$html_path"
fi

# Copy files
plugin_path="$userdata_path/plugins"
if [[ ! -d "$plugin_path" ]]; then
  echo "Copying plugin files to \"$plugin_path\"..."
  mkdir -p "$plugin_path"
  cp -r "$(dirname "$0")" "$plugin_path"
fi

echo "Successfully installed Typora Community Plugin."
