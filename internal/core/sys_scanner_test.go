package core

import (
	"testing"
)

func TestListAvailableShells(t *testing.T) {
	shells, err := ListAvailableShells()
	if err != nil {
		t.Fatalf("ListAvailableShells failed: %v", err)
	}
	if len(shells) == 0 {
		t.Log("Warning: No shells discovered (might be in limited container environment)")
	} else {
		t.Logf("Discovered %d shells: %+v", len(shells), shells)
	}
}

func TestParseWSLVerbose(t *testing.T) {
	mockWSLOutput := []byte("  NAME                   STATE           VERSION\n* Ubuntu-22.04           Running         2\n  docker-desktop         Stopped         2\n  Debian                 Stopped         1\n")
	distros := parseWSLVerbose(mockWSLOutput)

	if len(distros) != 3 {
		t.Fatalf("Expected 3 distros, got %d", len(distros))
	}

	if distros[0].Name != "Ubuntu-22.04" || !distros[0].IsDefault || distros[0].Version != 2 {
		t.Errorf("Unexpected distro[0]: %+v", distros[0])
	}
	if distros[1].Name != "docker-desktop" || distros[1].IsDefault || distros[1].Version != 2 {
		t.Errorf("Unexpected distro[1]: %+v", distros[1])
	}
	if distros[2].Name != "Debian" || distros[2].IsDefault || distros[2].Version != 1 {
		t.Errorf("Unexpected distro[2]: %+v", distros[2])
	}
}
