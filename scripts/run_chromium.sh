#!/bin/bash

# SynthX Extension Launcher
# Starts Chromium with the extension loaded in developer mode

EXTENSION_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/synthx-extension"

echo "Loading SynthX extension from: $EXTENSION_PATH"
echo "Extension ID will be displayed after loading"

# Launch Chromium with extension
# Note: Adjust path based on your Chromium installation
chromium --load-extension="$EXTENSION_PATH"
