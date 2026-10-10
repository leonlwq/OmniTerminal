#!/usr/bin/env bash
set -e

# Clean old artifacts
rm -rf build/bin/omniterminal* build/bin/OmniTerminal.app OmniTerminal.dmg

function build_all() {
    wails build \
    -platform windows/amd64,windows/arm64,darwin/amd64,darwin/arm64
}

function package_darwin() {
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ] && [ -d "build/bin/omniterminal-arm64.app" ]; then
        rm -rf build/bin/OmniTerminal.app build/bin/omniterminal.app
        cp -R build/bin/omniterminal-arm64.app build/bin/OmniTerminal.app
    elif [ -d "build/bin/omniterminal-amd64.app" ]; then
        rm -rf build/bin/OmniTerminal.app build/bin/omniterminal.app
        cp -R build/bin/omniterminal-amd64.app build/bin/OmniTerminal.app
    fi

    if [ -d "build/bin/OmniTerminal.app" ]; then
        rm -f OmniTerminal.dmg
        create-dmg --volname "OmniTerminal" \
        --window-size 800 400 \
        --icon-size 128 \
        --icon "OmniTerminal.app" 200 200 \
        --app-drop-link 600 200 \
        --overwrite \
        OmniTerminal.dmg \
        build/bin/OmniTerminal.app || true
    fi
}

function package_windows() {
    if [ -f "build/bin/omniterminal-amd64.exe" ]; then
        zip -q -u OmniTerminal-windows-amd64.zip build/bin/omniterminal-amd64.exe || zip -q OmniTerminal-windows-amd64.zip build/bin/omniterminal-amd64.exe
    fi
    if [ -f "build/bin/omniterminal-arm64.exe" ]; then
        zip -q -u OmniTerminal-windows-arm64.zip build/bin/omniterminal-arm64.exe || zip -q OmniTerminal-windows-arm64.zip build/bin/omniterminal-arm64.exe
    fi
}

build_all
package_darwin
package_windows

