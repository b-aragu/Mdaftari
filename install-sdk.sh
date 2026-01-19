#!/bin/bash
set -e

# Configuration
SDK_ROOT="$HOME/Android/Sdk"
CMD_TOOLS_ZIP="commandlinetools-linux-11076708_latest.zip"
CMD_TOOLS_URL="https://dl.google.com/android/repository/$CMD_TOOLS_ZIP"

echo "Creating SDK directory..."
mkdir -p "$SDK_ROOT"
cd "$SDK_ROOT"

if [ ! -d "cmdline-tools" ]; then
    echo "Downloading Command Line Tools..."
    wget -q "$CMD_TOOLS_URL" -O "$CMD_TOOLS_ZIP"
    
    echo "Unzipping..."
    unzip -q "$CMD_TOOLS_ZIP"
    
    # Restructure for latest sdkmanager requirements
    mkdir -p cmdline-tools/latest
    mv cmdline-tools/bin cmdline-tools/latest/
    mv cmdline-tools/lib cmdline-tools/latest/
    mv cmdline-tools/NOTICE.txt cmdline-tools/latest/
    mv cmdline-tools/source.properties cmdline-tools/latest/
    
    rm "$CMD_TOOLS_ZIP"
else
    echo "Command Line Tools already installed."
fi

# Set environment variables for this session
export ANDROID_HOME="$SDK_ROOT"
export PATH="$SDK_ROOT/cmdline-tools/latest/bin:$SDK_ROOT/platform-tools:$PATH"

echo "Accepting licenses..."
yes | sdkmanager --licenses >/dev/null

echo "Installing Platform Tools, Build Tools, and Platforms..."
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo "Done! Android SDK installed at $SDK_ROOT"
