package app

import (
	"testing"
)

func TestParseSSHConfig(t *testing.T) {
	input := `
Host dev-server
    HostName 192.168.1.100
    User ubuntu
    Port 2222

Host prod-bastion
    HostName 10.0.0.1
    User admin
    Port 22
`
	sessions, err := parseSSHConfig(input)
	if err != nil {
		t.Fatalf("parseSSHConfig failed: %v", err)
	}
	if len(sessions) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(sessions))
	}

	if sessions[0].Name != "dev-server" || sessions[0].Host != "192.168.1.100" || sessions[0].Port != 2222 || sessions[0].User != "ubuntu" {
		t.Errorf("unexpected dev-server session: %+v", sessions[0])
	}
	if sessions[1].Name != "prod-bastion" || sessions[1].Host != "10.0.0.1" || sessions[1].Port != 22 || sessions[1].User != "admin" {
		t.Errorf("unexpected prod-bastion session: %+v", sessions[1])
	}
}

func TestParseXshellConfig(t *testing.T) {
	input := `
[Connection]
Host=192.168.2.50
Port=22022
UserName=deploy
[Terminal]
Encoding=GBK
`
	sessions, err := parseXshellConfig(input, "my-server.xsh")
	if err != nil {
		t.Fatalf("parseXshellConfig failed: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(sessions))
	}
	s := sessions[0]
	if s.Name != "my-server" || s.Host != "192.168.2.50" || s.Port != 22022 || s.User != "deploy" || s.Encoding != "GBK" {
		t.Errorf("unexpected xshell session: %+v", s)
	}
}

func TestParseSecureCRTXML(t *testing.T) {
	input := `<?xml version="1.0" encoding="UTF-8"?>
<Sessions>
    <Session name="DB-Cluster-01">
        <Hostname>10.20.30.40</Hostname>
        <Port>22</Port>
        <Username>oracle</Username>
    </Session>
</Sessions>`
	sessions, err := parseSecureCRTConfig(input)
	if err != nil {
		t.Fatalf("parseSecureCRTConfig XML failed: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(sessions))
	}
	if sessions[0].Name != "DB-Cluster-01" || sessions[0].Host != "10.20.30.40" || sessions[0].User != "oracle" {
		t.Errorf("unexpected CRT session: %+v", sessions[0])
	}
}

func TestParseMobaXterm(t *testing.T) {
	input := `
[Bookmarks]
SubRep=
WebServer=#109#192.168.10.5%22%nginx%%-1%-1%%%22%%0%0%0%%-1%#MobaFont%10%0%0%-1%15%236,236,236%0,0,0%
`
	sessions, err := parseMobaXtermConfig(input)
	if err != nil {
		t.Fatalf("parseMobaXtermConfig failed: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(sessions))
	}
	if sessions[0].Name != "WebServer" || sessions[0].Host != "192.168.10.5" || sessions[0].User != "nginx" {
		t.Errorf("unexpected MobaXterm session: %+v", sessions[0])
	}
}

func TestParsePuttyConfig(t *testing.T) {
	input := `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\Software\SimonTatham\PuTTY\Sessions\My%20Router]
"HostName"="192.168.1.1"
"PortNumber"=dword:00000016
"UserName"="admin"
`
	sessions, err := parsePuttyConfig(input)
	if err != nil {
		t.Fatalf("parsePuttyConfig failed: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(sessions))
	}
	if sessions[0].Name != "My Router" || sessions[0].Host != "192.168.1.1" || sessions[0].User != "admin" || sessions[0].Port != 22 {
		t.Errorf("unexpected PuTTY session: %+v", sessions[0])
	}
}

func TestParseTermiusConfig(t *testing.T) {
	input := `[
  {
    "label": "API Gateway",
    "address": "api.example.com",
    "port": 2222,
    "username": "core"
  }
]`
	sessions, err := parseTermiusConfig(input)
	if err != nil {
		t.Fatalf("parseTermiusConfig failed: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(sessions))
	}
	if sessions[0].Name != "API Gateway" || sessions[0].Host != "api.example.com" || sessions[0].Port != 2222 || sessions[0].User != "core" {
		t.Errorf("unexpected Termius session: %+v", sessions[0])
	}
}
