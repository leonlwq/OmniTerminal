export const REPO = 'leonlwq/OmniTerminal';
export const FALLBACK_VERSION = 'v1.0.1';

/**
 * 自动从 src/content/changelog 目录扫描所有版本 markdown 文件，
 * 并按语义化版本逆序排序，返回最新版本号 (如 "v1.0.1")。
 * 当你在 src/content/changelog/ 下增加新版本文件 (如 v1.0.2.md) 时，
 * 网站构建时会自动识别并更新为最新版本，无需手动修改任何代码。
 */
function resolveLatestVersionFromChangelogs(): string {
  try {
    const files = import.meta.glob('../content/changelog/*.md', { eager: true });
    const versionList: string[] = [];

    for (const path of Object.keys(files)) {
      const match = path.match(/v?(\d+\.\d+\.\d+)/);
      if (match && match[1]) {
        versionList.push(match[1]);
      }
    }

    if (versionList.length > 0) {
      versionList.sort((a, b) => {
        const partsA = a.split('.').map(n => parseInt(n, 10) || 0);
        const partsB = b.split('.').map(n => parseInt(n, 10) || 0);
        for (let i = 0; i < 3; i++) {
          if ((partsB[i] || 0) !== (partsA[i] || 0)) {
            return (partsB[i] || 0) - (partsA[i] || 0);
          }
        }
        return 0;
      });
      return `v${versionList[0]}`;
    }
  } catch (_) {
    // 忽略异常，降级回退
  }
  return FALLBACK_VERSION;
}

// 优先读取环境变量 PUBLIC_APP_VERSION (支持 CI/CD 自动注入)，否则自动分析 changelog
export const LATEST_VERSION: string = (() => {
  if (typeof process !== 'undefined' && process.env?.PUBLIC_APP_VERSION) {
    const envV = process.env.PUBLIC_APP_VERSION.trim();
    return envV.startsWith('v') ? envV : `v${envV}`;
  }
  return resolveLatestVersionFromChangelogs();
})();

// 纯数字版本号 (如 "1.0.1")
export const LATEST_VERSION_NUM: string = LATEST_VERSION.replace(/^v/, '');

// GitHub 下载基础路径
export const BASE_DOWNLOAD_URL = `https://github.com/${REPO}/releases/download/${LATEST_VERSION}`;

/**
 * 生成指定资产在目标版本下的下载链接
 */
export function getReleaseAssetUrl(filename: string, version: string = LATEST_VERSION): string {
  return `https://github.com/${REPO}/releases/download/${version}/${filename}`;
}
