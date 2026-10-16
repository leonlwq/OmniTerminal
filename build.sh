#!/usr/bin/env bash
set -e

VERSION=$(git describe --tags --always 2>/dev/null || echo "v1.0.1")
if [[ "$VERSION" != v* ]]; then
    VERSION="v$VERSION"
fi

function build_all() {
    echo "==> 正在编译 OmniTerminal (版本: ${VERSION})..."
    wails build \
    -platform darwin/arm64,windows/amd64,windows/arm64 \
    -clean \
    -trimpath \
    -ldflags "-s -w -X omniterminal/internal/config.AppVersion=${VERSION}"
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

    if [ -f "build/appicon.png" ] && [ -d "build/bin/OmniTerminal.app/Contents/Resources" ]; then
        ICONSET_TMP=$(mktemp -d)/omni.iconset
        mkdir -p "$ICONSET_TMP"
        sips -z 16 16     build/appicon.png --out "$ICONSET_TMP/icon_16x16.png" >/dev/null 2>&1 || true
        sips -z 32 32     build/appicon.png --out "$ICONSET_TMP/icon_16x16@2x.png" >/dev/null 2>&1 || true
        sips -z 32 32     build/appicon.png --out "$ICONSET_TMP/icon_32x32.png" >/dev/null 2>&1 || true
        sips -z 64 64     build/appicon.png --out "$ICONSET_TMP/icon_32x32@2x.png" >/dev/null 2>&1 || true
        sips -z 128 128   build/appicon.png --out "$ICONSET_TMP/icon_128x128.png" >/dev/null 2>&1 || true
        sips -z 256 256   build/appicon.png --out "$ICONSET_TMP/icon_128x128@2x.png" >/dev/null 2>&1 || true
        sips -z 256 256   build/appicon.png --out "$ICONSET_TMP/icon_256x256.png" >/dev/null 2>&1 || true
        sips -z 512 512   build/appicon.png --out "$ICONSET_TMP/icon_256x256@2x.png" >/dev/null 2>&1 || true
        sips -z 512 512   build/appicon.png --out "$ICONSET_TMP/icon_512x512.png" >/dev/null 2>&1 || true
        sips -z 1024 1024 build/appicon.png --out "$ICONSET_TMP/icon_512x512@2x.png" >/dev/null 2>&1 || true
        iconutil -c icns "$ICONSET_TMP" -o build/bin/OmniTerminal.app/Contents/Resources/iconfile.icns || true
        rm -rf "$ICONSET_TMP"
        touch build/bin/OmniTerminal.app
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

