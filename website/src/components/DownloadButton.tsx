import React, { useState, useEffect } from 'react';
import { Download, ChevronDown, Apple, Monitor, Terminal, CheckCircle2 } from 'lucide-react';

interface ReleaseAsset {
  filename: string;
  os: 'mac' | 'windows' | 'linux';
  url: string;
  labels: Record<'en' | 'zh' | 'ja' | 'ko', { label: string; arch: string; badge: string }>;
}

const REPO = 'leonlwq/OmniTerminal';
const VERSION = 'v1.0.0';
const BASE_DOWNLOAD = `https://github.com/${REPO}/releases/download/${VERSION}`;

const ALL_ASSETS: ReleaseAsset[] = [
  {
    filename: 'OmniTerminal-macos-arm64.dmg',
    os: 'mac',
    url: `${BASE_DOWNLOAD}/OmniTerminal-macos-arm64.dmg`,
    labels: {
      en: { label: 'macOS (Apple Silicon M-Series)', arch: 'arm64 (M1/M2/M3/M4)', badge: 'DMG Image' },
      zh: { label: 'macOS (Apple Silicon M系列)', arch: 'arm64 (M1/M2/M3/M4)', badge: 'DMG 镜像' },
      ja: { label: 'macOS (Apple Silicon Mシリーズ)', arch: 'arm64 (M1/M2/M3/M4)', badge: 'DMG イメージ' },
      ko: { label: 'macOS (Apple Silicon M시리즈)', arch: 'arm64 (M1/M2/M3/M4)', badge: 'DMG 이미지' },
    },
  },
  {
    filename: 'OmniTerminal-macos-arm64.zip',
    os: 'mac',
    url: `${BASE_DOWNLOAD}/OmniTerminal-macos-arm64.zip`,
    labels: {
      en: { label: 'macOS (Apple Silicon ZIP)', arch: 'arm64 (Portable ZIP)', badge: 'ZIP Archive' },
      zh: { label: 'macOS (Apple Silicon ZIP)', arch: 'arm64 (免安装包)', badge: 'ZIP 压缩包' },
      ja: { label: 'macOS (Apple Silicon ZIP)', arch: 'arm64 (ポータブル)', badge: 'ZIP アーカイブ' },
      ko: { label: 'macOS (Apple Silicon ZIP)', arch: 'arm64 (포터블 무설치)', badge: 'ZIP 아카이브' },
    },
  },
  {
    filename: 'OmniTerminal-macos-intel.dmg',
    os: 'mac',
    url: `${BASE_DOWNLOAD}/OmniTerminal-macos-intel.dmg`,
    labels: {
      en: { label: 'macOS (Intel 64-bit)', arch: 'x86_64', badge: 'DMG Image' },
      zh: { label: 'macOS (Intel 芯片)', arch: 'x86_64', badge: 'DMG 镜像' },
      ja: { label: 'macOS (Intel プロセッサ)', arch: 'x86_64', badge: 'DMG イメージ' },
      ko: { label: 'macOS (Intel 64비트)', arch: 'x86_64', badge: 'DMG 이미지' },
    },
  },
  {
    filename: 'OmniTerminal-windows-amd64.zip',
    os: 'windows',
    url: `${BASE_DOWNLOAD}/OmniTerminal-windows-amd64.zip`,
    labels: {
      en: { label: 'Windows 64-bit (Portable)', arch: 'x86_64 / amd64', badge: 'Portable ZIP' },
      zh: { label: 'Windows 64位 (绿色免安装)', arch: 'x86_64 / amd64', badge: 'ZIP 绿色版' },
      ja: { label: 'Windows 64ビット (ポータブル)', arch: 'x86_64 / amd64', badge: 'ZIP ポータブル' },
      ko: { label: 'Windows 64비트 (포터블 무설치)', arch: 'x86_64 / amd64', badge: 'ZIP 포터블' },
    },
  },
  {
    filename: 'OmniTerminal-windows-arm64.zip',
    os: 'windows',
    url: `${BASE_DOWNLOAD}/OmniTerminal-windows-arm64.zip`,
    labels: {
      en: { label: 'Windows ARM64 (Surface / Snapdragon)', arch: 'arm64', badge: 'Portable ZIP' },
      zh: { label: 'Windows ARM64 (Surface / 骁龙)', arch: 'arm64', badge: 'ZIP 绿色版' },
      ja: { label: 'Windows ARM64 (Surface / Snapdragon)', arch: 'arm64', badge: 'ZIP ポータブル' },
      ko: { label: 'Windows ARM64 (Surface / Snapdragon)', arch: 'arm64', badge: 'ZIP 포터블' },
    },
  },
  {
    filename: 'OmniTerminal-linux-amd64.tar.gz',
    os: 'linux',
    url: `${BASE_DOWNLOAD}/OmniTerminal-linux-amd64.tar.gz`,
    labels: {
      en: { label: 'Linux 64-bit (Universal)', arch: 'x86_64 (glibc 2.35+)', badge: 'tar.gz Archive' },
      zh: { label: 'Linux 64位 (通用标准包)', arch: 'x86_64 (glibc 2.35+)', badge: 'tar.gz 标准包' },
      ja: { label: 'Linux 64ビット (汎用標準)', arch: 'x86_64 (glibc 2.35+)', badge: 'tar.gz アーカイブ' },
      ko: { label: 'Linux 64비트 (범용 표준 패키지)', arch: 'x86_64 (glibc 2.35+)', badge: 'tar.gz 아카이브' },
    },
  },
];

interface Props {
  lang?: 'en' | 'zh' | 'ja' | 'ko';
}

export default function DownloadButton({ lang = 'en' }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [detectedOs, setDetectedOs] = useState<'mac-arm' | 'mac-intel' | 'windows' | 'linux'>('mac-arm');

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

  const currentInfo = primary.labels[lang] || primary.labels.en;
  const primaryLabel = currentInfo.label.split(' ')[0];
  const primaryBadge = currentInfo.badge;

  const downloadText = {
    en: 'Download for',
    zh: '立即下载',
    ja: 'ダウンロード',
    ko: '다운로드',
  }[lang];

  const selectOtherText = {
    en: 'Select other platforms',
    zh: '选择其他平台安装包',
    ja: 'その他のプラットフォームを選択',
    ko: '다른 플랫폼 패키지 선택',
  }[lang];

  const freeText = {
    en: 'Free & Open Source (MIT)',
    zh: '免费开源 (MIT)',
    ja: '無料・オープンソース (MIT)',
    ko: '무료 오픈소스 (MIT)',
  }[lang];

  const supportText = {
    en: 'Supports macOS, Windows, Linux',
    zh: '支持 macOS, Windows, Linux',
    ja: 'macOS、Windows、Linux 対応',
    ko: 'macOS, Windows, Linux 지원',
  }[lang];

  const releaseTitle = {
    en: `Release Packages (${VERSION})`,
    zh: `全平台正式发布包 (${VERSION})`,
    ja: `公式リリースパッケージ (${VERSION})`,
    ko: `공식 릴리즈 패키지 (${VERSION})`,
  }[lang];

  const viewNotesText = {
    en: 'View Release Notes & Checksums on GitHub →',
    zh: '前往 GitHub Release 查看 Release Notes 与校验和 →',
    ja: 'GitHub Release ノートとチェックサムを確認 →',
    ko: 'GitHub Release 노트 및 체크섬 확인 →',
  }[lang];

  return (
    <div className="relative inline-flex flex-col items-center text-center" id="download-cta">
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
              {downloadText} <span className="text-blue-300 font-normal">{primaryLabel}</span>
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
          aria-label={selectOtherText}
          className="flex items-center justify-center px-3 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white rounded-r-xl border-l border-white/10 transition-colors cursor-pointer"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Subtitle tag */}
      <div className="mt-2.5 text-xs text-slate-400 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> {freeText}
        </span>
        <span className="text-slate-600">•</span>
        <span>{supportText}</span>
      </div>

      {/* Dropdown list */}
      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-80 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              {releaseTitle}
            </div>
            <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
              {ALL_ASSETS.map((asset) => {
                const info = asset.labels[lang] || asset.labels.en;
                return (
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
                          {info.label}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {info.arch}
                        </div>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </a>
                );
              })}
            </div>
            <div className="p-2 bg-slate-950/60 rounded-xl mt-1 text-center">
              <a
                href={`https://github.com/${REPO}/releases/tag/${VERSION}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                {viewNotesText}
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
