import { describe, it, expect } from 'vitest';
import { normalizeHexColor, DEFAULT_HIGHLIGHT_RULES } from '../constants/defaultHighlightRules';

describe('HighlightRules & Helpers', () => {
  it('normalizes hex colors correctly', () => {
    expect(normalizeHexColor('#f14c4c')).toBe('#f14c4c');
    expect(normalizeHexColor('#fff')).toBe('#ffffff');
    expect(normalizeHexColor('#abc')).toBe('#aabbcc');
    expect(normalizeHexColor('red')).toBe('#f14c4c');
    expect(normalizeHexColor('green')).toBe('#89d185');
    expect(normalizeHexColor('')).toBeUndefined();
    expect(normalizeHexColor(undefined)).toBeUndefined();
  });

  it('contains expected default highlight rules for logs and network', () => {
    const ids = DEFAULT_HIGHLIGHT_RULES.map(r => r.id);
    expect(ids).toContain('preset_fatal');
    expect(ids).toContain('preset_error');
    expect(ids).toContain('preset_warning');
    expect(ids).toContain('preset_success');
    expect(ids).toContain('preset_ipv4');
    expect(ids).toContain('preset_timestamp');
    expect(ids).toContain('preset_path');
    expect(ids).toContain('preset_http_status');
  });

  it('matches error keywords accurately', () => {
    const errorRule = DEFAULT_HIGHLIGHT_RULES.find(r => r.id === 'preset_error')!;
    const flags = errorRule.ignoreCase ? 'gi' : 'g';
    const regex = new RegExp(errorRule.pattern, flags);

    expect(regex.test('2026-10-14 [ERROR] Connection reset by peer')).toBe(true);
    regex.lastIndex = 0;
    expect(regex.test('Operation failed with exit code 1')).toBe(true);
    regex.lastIndex = 0;
    expect(regex.test('ERR: invalid argument')).toBe(true);
  });

  it('matches IPv4 addresses accurately with port', () => {
    const ipRule = DEFAULT_HIGHLIGHT_RULES.find(r => r.id === 'preset_ipv4')!;
    const regex = new RegExp(ipRule.pattern, 'g');

    expect(regex.test('Listening on 127.0.0.1:8080 and 192.168.1.100')).toBe(true);
    regex.lastIndex = 0;
    const matches = 'Listening on 127.0.0.1:8080 and 192.168.1.100'.match(regex);
    expect(matches).toContain('127.0.0.1:8080');
    expect(matches).toContain('192.168.1.100');
  });

  it('matches file paths accurately', () => {
    const pathRule = DEFAULT_HIGHLIGHT_RULES.find(r => r.id === 'preset_path')!;
    const regex = new RegExp(pathRule.pattern, 'g');

    expect(regex.test('Logs saved in /var/log/syslog and /etc/nginx/nginx.conf')).toBe(true);
  });
});
