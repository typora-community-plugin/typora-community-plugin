html=$(cat "$html_path")

# LINUX_START
userdata_url=$(echo "$html" | grep -oP 'typora:/(/app)?/userData' | head -n 1)
userdata_path="$HOME/.config/Typora"
# LINUX_END

# MACOS_START
userdata_url="file://$HOME/Library/Application%20Support/abnerworks.Typora"
userdata_path="$HOME/Library/Application Support/abnerworks.Typora"
# MACOS_END

echo "UserData path: $userdata_path"
