#!/bin/bash

# Typora Community Plugin Installer for macOS and Linux

set -e

# Detect OS
OS="$(uname)"
USER_HOME="$HOME"

# Define default paths
if [ "$OS" == "Darwin" ]; then
    # macOS
    echo "Detected OS: macOS"
    DEFAULT_TYPORA_PATH="/Applications/Typora.app"
    TYPORA_RES_DIR="$DEFAULT_TYPORA_PATH/Contents/Resources/TypeMark"
    HTML_FILE="$TYPORA_RES_DIR/index.html"
    PLUGIN_BASE_DIR="$USER_HOME/Library/Application Support/abnerworks.Typora"
    PLUGIN_DIR="$PLUGIN_BASE_DIR/plugins"
    # Using 'file://' protocol with absolute path for macOS
    # We need to URL-encode the path to handle spaces correctly
    if command -v python3 &>/dev/null; then
        LOADER_SCRIPT_SRC=$(python3 -c "import urllib.parse; print('file://' + urllib.parse.quote('''$PLUGIN_DIR/loader.js''', safe='/'))")
    else
        # Fallback if python3 is missing (unlikely on macOS)
        PLUGIN_PATH_ENCODED=$(echo "$PLUGIN_DIR/loader.js" | sed 's/ /%20/g')
        LOADER_SCRIPT_SRC="file://$PLUGIN_PATH_ENCODED"
    fi
elif [ "$OS" == "Linux" ]; then
    # Linux
    echo "Detected OS: Linux"
    DEFAULT_TYPORA_PATH="/usr/share/typora"
    TYPORA_RES_DIR="$DEFAULT_TYPORA_PATH/resources"
    HTML_FILE="$TYPORA_RES_DIR/window.html"
    PLUGIN_BASE_DIR="$USER_HOME/.config/Typora"
    PLUGIN_DIR="$PLUGIN_BASE_DIR/plugins"
    # Using 'typora://' protocol for Linux/Windows usually works
    LOADER_SCRIPT_SRC="typora://app/userData/plugins/loader.js"
else
    echo "Error: Unsupported Operating System: $OS"
    echo "This script supports macOS and Linux."
    exit 1
fi

echo "=========================================="
echo "      Typora Community Plugin Installer   "
echo "=========================================="

# 1. Locate Typora
if [ ! -d "$DEFAULT_TYPORA_PATH" ]; then
    echo "Warning: Typora not found at default location ($DEFAULT_TYPORA_PATH)."
    echo "Please enter the path to your Typora application:"
    read -r USER_PATH
    
    if [ ! -d "$USER_PATH" ]; then
        echo "Error: Directory not found: $USER_PATH"
        exit 1
    fi
    
    # Adjust HTML file path based on user input
    if [ "$OS" == "Darwin" ]; then
        HTML_FILE="$USER_PATH/Contents/Resources/TypeMark/index.html"
    else
        HTML_FILE="$USER_PATH/resources/window.html"
    fi
else
    echo "Found Typora at: $DEFAULT_TYPORA_PATH"
fi

if [ ! -f "$HTML_FILE" ]; then
    echo "Error: Could not find entry HTML file at: $HTML_FILE"
    exit 1
fi

# 2. Copy Plugin Files
echo "------------------------------------------"
echo "Installing plugin files..."
echo "Target Directory: $PLUGIN_DIR"

mkdir -p "$PLUGIN_DIR"

# Copy all files from current directory to plugin directory
# Excluding the install script itself and basic ignores is good practice, 
# but simply overwriting is fine for 'install'
cp -R ./* "$PLUGIN_DIR/"

# Enable debug mode by default for troubleshooting
if [ -f "$PLUGIN_DIR/loader.json" ]; then
    echo "Enabling debug mode in loader.json..."
    if [ "$OS" == "Darwin" ]; then
        sed -i '' 's/"debug":false/"debug":true/' "$PLUGIN_DIR/loader.json"
    else
        sed -i 's/"debug":false/"debug":true/' "$PLUGIN_DIR/loader.json"
    fi
fi

echo "Files copied successfully."

# 3. Inject Loader Script
echo "------------------------------------------"
echo "Checking $HTML_FILE for injection..."

# Clean up possible old injections first to avoid duplicates
# We remove lines containing "loader.js" and restore </body> tag if needed
USE_SUDO=false
if [ ! -w "$HTML_FILE" ]; then
    echo "Root privileges required to modify Typora application files."
    USE_SUDO=true
fi

# Determine how to run commands (sudo or not)
RUN_CMD=""
if [ "$USE_SUDO" = true ]; then
    RUN_CMD="sudo"
fi

# Backup if not exists
if [ ! -f "$HTML_FILE.bak" ]; then
    echo "Creating backup: $HTML_FILE.bak"
    $RUN_CMD cp "$HTML_FILE" "$HTML_FILE.bak"
else
    echo "Backup already exists."
fi

echo "Injecting loader script..."
INJECTION_TAG="<script src=\"$LOADER_SCRIPT_SRC\" type=\"module\"></script>"

# Use sed to remove old script and append new one properly
# We will use temporary file approach which is safer
TEMP_FILE=$(mktemp)

# Read file, remove lines with plugin info, remove </body>, then append new script and </body>
# This resets the file to a clean state + new injection
grep -v "plugins/loader.js" "$HTML_FILE" | sed 's|</body>||g' | sed 's|</html>||g' > "$TEMP_FILE"

# Append injection
echo "" >> "$TEMP_FILE"
echo "$INJECTION_TAG" >> "$TEMP_FILE"
echo "</body>" >> "$TEMP_FILE"
echo "</html>" >> "$TEMP_FILE"

# Move back
if [ "$USE_SUDO" = true ]; then
    cat "$TEMP_FILE" | sudo tee "$HTML_FILE" > /dev/null
else
    cat "$TEMP_FILE" > "$HTML_FILE"
fi

rm "$TEMP_FILE"

echo "Injection complete."


echo "=========================================="
echo "Installation Finished!"
echo "Please restart Typora to see changes."
