import React, { useState, useEffect } from 'react';
import { Download, ChevronDown, Apple, Monitor, Terminal, CheckCircle2 } from 'lucide-react';

interface ReleaseAsset {
  labelZh: string;
  labelEn: string;
  filename: string;
  archZh: string;
  archEn: string;
  os: 'mac' | 'windows' | 'linux';
  badgeZh: string;
  badgeEn: string;
  url: string;
}

const REPO = 'leonlwq/OmniTerminal';
const VERSION = 'v1.0.0';
const BASE_DOWNLOAD = `https://github.com/${REPO}/releases/download/${VERSION}`;

const ALL_ASSETS: ReleaseAsset[] = [
  {
    labelZh: 'macOS (Apple Silicon M系列)',
    labelEn: 'macOS (Apple Silicon M-Series)',
    filename: 'OmniTerminal-macos-arm64.dmg',
    archZh: 'arm64 (M1/M2/M3/M4)',
    archEn: 'arm64 (M1/M2/M3/M4)',
    os: 'mac',
    badgeZh: 'DMG 镜像',
    badgeEn: 'DMG Image',
    url: `${BASE_DOWNLOAD}/OmniTerminal-macos-arm64.dmg`,
  },
  {
    labelZh: 'macOS (Apple Silicon ZIP)',
    labelEn: 'macOS (Apple Silicon ZIP)',
    filename: 'OmniTerminal-macos-arm64.zip',
    archZh: 'arm64 (免安装包)',
    archEn: 'arm64 (Portable ZIP)',
    os: 'mac',
    badgeZh: 'ZIP 压缩包',
    badgeEn: 'ZIP Archive',
    url: `${BASE_DOWNLOAD}/OmniTerminal-macos-arm64.zip`,
  },
  {
    labelZh: 'macOS (Intel 芯片)',
    labelEn: 'macOS (Intel 64-bit)',
    filename: 'OmniTerminal-macos-intel.dmg',
    archZh: 'x86_64',
    archEn: 'x86_64',
    os: 'mac',
    badgeZh: 'DMG 镜像',
    badgeEn: 'DMG Image',
    url: `${BASE_DOWNLOAD}/OmniTerminal-macos-intel.dmg`,
  },
  {
    labelZh: 'Windows 64位 (绿色免安装)',
    labelEn: 'Windows 64-bit (Portable)',
    filename: 'OmniTerminal-windows-amd64.zip',
    archZh: 'x86_64 / amd64',
    archEn: 'x86_64 / amd64',
    os: 'windows',
    badgeZh: 'ZIP 绿色版',
    badgeEn: 'Portable ZIP',
    url: `${BASE_DOWNLOAD}/OmniTerminal-windows-amd64.zip`,
  },
  {
    labelZh: 'Windows ARM64 (Surface / 骁龙)',
    labelEn: 'Windows ARM64 (Surface / Snapdragon)',
    filename: 'OmniTerminal-windows-arm64.zip',
    archZh: 'arm64',
    archEn: 'arm64',
    os: 'windows',
    badgeZh: 'ZIP 绿色版',
    badgeEn: 'Portable ZIP',
    url: `${BASE_DOWNLOAD}/OmniTerminal-windows-arm64.zip`,
  },
  {
    labelZh: 'Linux 64位 (通用标准包)',
    labelEn: 'Linux 64-bit (Universal)',
    filename: 'OmniTerminal-linux-amd64.tar.gz',
    archZh: 'x86_64 (glibc 2.35+)',
    archEn: 'x86_64 (glibc 2.35+)',
    os: 'linux',
    badgeZh: 'tar.gz 标准包',
    badgeEn: 'tar.gz Archive',
    url: `${BASE_DOWNLOAD}/OmniTerminal-linux-amd64.tar.gz`,
  },
];

interface Props {
  lang?: 'zh' | 'en';
}

export default function DownloadButton({ lang = 'zh' }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [detectedOs, setDetectedOs] = useState<'mac-arm' | 'mac-intel' | 'windows' | 'linux'>('mac-arm');

  const isEn = lang === 'en';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent.toLowerCase();
    const platform = window.navigator.platform?.toLowerCase() || '';

    if (ua.includes('win')) {
      setDetectedOs('windows');
    } else if (ua.includes('linux')) {
      setDetectedOs('linux');
    } else if (ua.includes('mac') || platform.includes('mac')) {
      setDetectedOs('mac-arm');
    }
  }, []);

  const getPrimaryAsset = (): ReleaseAsset => {
    switch (detectedOs) {
      case 'windows':
        return ALL_ASSETS[3]; // Windows amd64
      case 'linux':
        return ALL_ASSETS[5]; // Linux
      case 'mac-intel':
        return ALL_ASSETS[2]; // Mac Intel
      case 'mac-arm':
      default:
        return ALL_ASSETS[0]; // Mac ARM64
    }
  };

  const primary = getPrimaryAsset();

  const getOsIcon = (os: string) => {
    switch (os) {
      case 'mac':
        return <Apple className="w-5 h-5 text-slate-200" />;
      case 'windows':
        return <Monitor className="w-5 h-5 text-blue-400" />;
      case 'linux':
        return <Terminal className="w-5 h-5 text-amber-400" />;
      default:
        return <Download className="w-5 h-5 text-slate-200" />;
    }
  };

  const primaryLabel = isEn ? primary.labelEn.split(' ')[0] : primary.labelZh.split(' ')[0];
  const primaryBadge = isEn ? primary.badgeEn : primary.badgeZh;

  return (
    <div className="relative inline-flex flex-col items-center sm:items-start text-left" id="download-cta">
      {/* Button wrapper */}
      <div className="inline-flex items-stretch rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-[1px] shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all">
        {/* Main CTA Button */}
        <a
          href={primary.url}
          className="flex items-center gap-3 px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-l-xl font-medium text-base transition-colors group"
        >
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors shrink-0">
            {getOsIcon(primary.os)}
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold tracking-wide flex items-center gap-1.5 leading-tight">
              {isEn ? 'Download for' : '立即下载'} <span className="text-blue-300 font-normal">{primaryLabel}</span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 leading-tight">
              <span>{primaryBadge}</span> • <span>{VERSION}</span>
            </div>
          </div>
        </a>

        {/* Dropdown toggle */}
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
          aria-label={isEn ? "Select other platforms" : "选择其他平台安装包"}
          className="flex items-center justify-center px-3 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white rounded-r-xl border-l border-white/10 transition-colors cursor-pointer"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Subtitle tag */}
      <div className="mt-2.5 text-xs text-slate-400 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> {isEn ? 'Free & Open Source (MIT)' : '免费开源 (MIT)'}
        </span>
        <span className="text-slate-600">•</span>
        <span>{isEn ? 'Supports macOS, Windows, Linux' : '支持 macOS, Windows, Linux'}</span>
      </div>

      {/* Dropdown list */}
      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute left-0 sm:left-auto sm:right-0 mt-3 w-80 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              {isEn ? `Release Packages (${VERSION})` : `全平台正式发布包 (${VERSION})`}
            </div>
            <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
              {ALL_ASSETS.map((asset) => (
                <a
                  key={asset.filename}
                  href={asset.url}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/70 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 group-hover:border-blue-500/40">
                      {getOsIcon(asset.os)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200 group-hover:text-blue-300 transition-colors">
                        {isEn ? asset.labelEn : asset.labelZh}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {isEn ? asset.archEn : asset.archZh}
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </a>
              ))}
            </div>
            <div className="p-2 bg-slate-950/60 rounded-xl mt-1 text-center">
              <a
                href={`https://github.com/${REPO}/releases/tag/${VERSION}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                {isEn ? 'View Release Notes & Checksums on GitHub →' : '前往 GitHub Release 查看 Release Notes 与校验和 →'}
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
