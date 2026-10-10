package core

import (
	"testing"
)

func TestParseCPUStat(t *testing.T) {
	line := "cpu  2255 34 2290 22625563 6290 127 456 0 0 0"
	usage := parseCPUStat(line)
	if usage < 0 || usage > 100 {
		t.Errorf("invalid cpu usage: %f", usage)
	}
}

func TestParseMemInfo(t *testing.T) {
	meminfo := `MemTotal:       16384000 kB
MemFree:         2048000 kB
MemAvailable:    8192000 kB
Buffers:          512000 kB
Cached:          6144000 kB
`
	pct, totalMB, usedMB := parseMemInfo(meminfo)
	if totalMB != 16000 {
		t.Errorf("expected totalMB 16000, got %d", totalMB)
	}
	if usedMB != 8000 {
		t.Errorf("expected usedMB 8000, got %d", usedMB)
	}
	if pct != 50.0 {
		t.Errorf("expected pct 50.0, got %f", pct)
	}
}

func TestParseDFOutput(t *testing.T) {
	dfOut := `Filesystem     1024-blocks      Used Available Capacity Mounted on
/dev/root        104857600  52428800  52428800      50% /
`
	pct, totalGB, usedGB := parseDFOutput(dfOut)
	if totalGB != 100.0 {
		t.Errorf("expected totalGB 100, got %f", totalGB)
	}
	if usedGB != 50.0 {
		t.Errorf("expected usedGB 50, got %f", usedGB)
	}
	if pct != 50.0 {
		t.Errorf("expected pct 50.0, got %f", pct)
	}
}

func TestParseProcessList(t *testing.T) {
	psOut := `  PID USER     %CPU %MEM STAT TIME     COMMAND
    1 root      0.0  0.1 Ss   00:00:02 /sbin/init
 1234 www-data  1.5  2.3 S    00:15:30 nginx: worker process
`
	procs := ParseProcessList(psOut)
	if len(procs) != 2 {
		t.Fatalf("expected 2 processes, got %d", len(procs))
	}
	if procs[0].PID != 1 || procs[0].User != "root" || procs[0].Command != "/sbin/init" {
		t.Errorf("unexpected proc 0: %+v", procs[0])
	}
	if procs[1].PID != 1234 || procs[1].CPU != 1.5 || procs[1].Mem != 2.3 {
		t.Errorf("unexpected proc 1: %+v", procs[1])
	}
}

func TestParseServiceList(t *testing.T) {
	svcOut := `nginx.service loaded active running A high performance web server
sshd.service  loaded active running OpenSSH server daemon
`
	services := ParseServiceList(svcOut)
	if len(services) != 2 {
		t.Fatalf("expected 2 services, got %d", len(services))
	}
	if services[0].Unit != "nginx.service" || services[0].Active != "active" {
		t.Errorf("unexpected service 0: %+v", services[0])
	}
}

func TestParsePortList(t *testing.T) {
	ssOut := `Netid State  Recv-Q Send-Q Local Address:Port Peer Address:PortProcess
tcp   LISTEN 0      128          0.0.0.0:22        0.0.0.0:*
tcp   LISTEN 0      511          0.0.0.0:80        0.0.0.0:*
`
	ports := ParsePortList(ssOut)
	if len(ports) != 2 {
		t.Fatalf("expected 2 ports, got %d", len(ports))
	}
	if ports[0].LocalAddr != "0.0.0.0:22" || ports[0].State != "LISTEN" {
		t.Errorf("unexpected port 0: %+v", ports[0])
	}
}

func TestParseNetDev(t *testing.T) {
	netDevOut := `Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo: 1234567       0    0    0    0     0          0         0  1234567       0    0    0    0     0       0          0
  eth0: 10485760     100    0    0    0     0          0         0  5242880      80    0    0    0     0       0          0
  ens3: 20971520     200    0    0    0     0          0         0  10485760    160    0    0    0     0       0          0
`
	rx, tx := parseNetDev(netDevOut)
	expectedRx := int64(10485760 + 20971520)
	expectedTx := int64(5242880 + 10485760)
	if rx != expectedRx {
		t.Errorf("expected rx %d, got %d", expectedRx, rx)
	}
	if tx != expectedTx {
		t.Errorf("expected tx %d, got %d", expectedTx, tx)
	}
}

