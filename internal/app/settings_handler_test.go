package app

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGenerateKeyPair(t *testing.T) {
	app := &App{ctx: context.Background()}

	keyTypes := []string{"ed25519", "rsa", "ecdsa-p256", "ecdsa-p384", "ecdsa-p521"}

	for _, kt := range keyTypes {
		t.Run("Generate_"+kt, func(t *testing.T) {
			res, err := app.GenerateKeyPair(kt)
			if err != nil {
				t.Fatalf("GenerateKeyPair(%s) failed: %v", kt, err)
			}
			if res["privateKey"] == "" {
				t.Errorf("expected non-empty privateKey for %s", kt)
			}
			if res["publicKey"] == "" {
				t.Errorf("expected non-empty publicKey for %s", kt)
			}
			if !strings.Contains(res["privateKey"], "-----BEGIN ") {
				t.Errorf("privateKey should have PEM header, got: %s", res["privateKey"][:30])
			}
			if !strings.HasPrefix(res["publicKey"], "ssh-") && !strings.HasPrefix(res["publicKey"], "ecdsa-") {
				t.Errorf("publicKey should have valid prefix, got: %s", res["publicKey"][:15])
			}
		})
	}

	// Test unsupported key type
	_, err := app.GenerateKeyPair("unsupported-algorithm")
	if err == nil {
		t.Error("expected error for unsupported key type")
	}
}

func TestImportAndExportColorScheme(t *testing.T) {
	app := &App{ctx: context.Background()}

	// 1. Test Windows Terminal JSON Import
	wtJSON := `{
		"name": "One Half Dark",
		"background": "#282C34",
		"foreground": "#DCDFE4",
		"cursorColor": "#528BFF",
		"black": "#282C34",
		"red": "#E06C75",
		"green": "#98C379",
		"yellow": "#E5C07B",
		"blue": "#61AFEF",
		"purple": "#C678DD",
		"cyan": "#56B6C2",
		"white": "#DCDFE4",
		"brightBlack": "#5C6370",
		"brightRed": "#E06C75",
		"brightGreen": "#98C379",
		"brightYellow": "#E5C07B",
		"brightBlue": "#61AFEF",
		"brightPurple": "#C678DD",
		"brightCyan": "#56B6C2",
		"brightWhite": "#FFFFFF"
	}`

	tc, err := app.ImportColorScheme(wtJSON)
	if err != nil {
		t.Fatalf("ImportColorScheme(WT JSON) failed: %v", err)
	}
	if tc.Name != "One Half Dark" || tc.Background != "#282C34" || tc.Red != "#E06C75" || tc.Magenta != "#C678DD" {
		t.Errorf("unexpected theme result: %+v", tc)
	}

	// 2. Test Xshell XCS Import
	xcsINI := `[Names]
count=1
name0=SolarizedDark

[SolarizedDark]
text=131,148,150
background=0,43,54
black=7,54,66
red=220,50,47
green=133,153,0
yellow=181,137,0
blue=38,139,210
magenta=211,54,130
cyan=42,161,152
white=238,232,213
`
	tcXCS, err := app.ImportColorScheme(xcsINI)
	if err != nil {
		t.Fatalf("ImportColorScheme(XCS) failed: %v", err)
	}
	if tcXCS.Name != "SolarizedDark" || tcXCS.Background != "#002B36" || tcXCS.Red != "#DC322F" {
		t.Errorf("unexpected XCS parse result: %+v", tcXCS)
	}

	// 3. Test iTerm2 Plist XML Import
	itermXML := `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Background Color</key>
	<dict>
		<key>Blue Component</key>
		<real>0.1</real>
		<key>Green Component</key>
		<real>0.2</real>
		<key>Red Component</key>
		<real>0.3</real>
	</dict>
	<key>Foreground Color</key>
	<dict>
		<key>Blue Component</key>
		<real>0.9</real>
		<key>Green Component</key>
		<real>0.9</real>
		<key>Red Component</key>
		<real>0.9</real>
	</dict>
	<key>Ansi 1 Color</key>
	<dict>
		<key>Blue Component</key>
		<real>0.0</real>
		<key>Green Component</key>
		<real>0.0</real>
		<key>Red Component</key>
		<real>1.0</real>
	</dict>
</dict>
</plist>`

	tcIterm, err := app.ImportColorScheme(itermXML)
	if err != nil {
		t.Fatalf("ImportColorScheme(iTerm) failed: %v", err)
	}
	if tcIterm.Red != "#FF0000" {
		t.Errorf("expected Red #FF0000, got %s", tcIterm.Red)
	}

	// 4. Test ExportColorScheme for JSON, iTerm, XCS
	tmpDir := t.TempDir()
	jsonPath := filepath.Join(tmpDir, "theme.json")
	itermPath := filepath.Join(tmpDir, "theme.itermcolors")
	xcsPath := filepath.Join(tmpDir, "theme.xcs")

	if err := app.ExportColorScheme(tc, jsonPath); err != nil {
		t.Errorf("ExportColorScheme(.json) failed: %v", err)
	}
	if err := app.ExportColorScheme(tc, itermPath); err != nil {
		t.Errorf("ExportColorScheme(.itermcolors) failed: %v", err)
	}
	if err := app.ExportColorScheme(tc, xcsPath); err != nil {
		t.Errorf("ExportColorScheme(.xcs) failed: %v", err)
	}

	// Verify exported files exist and are non-empty
	for _, p := range []string{jsonPath, itermPath, xcsPath} {
		data, err := os.ReadFile(p)
		if err != nil || len(data) == 0 {
			t.Errorf("exported file %s invalid or empty", p)
		}
	}
}
