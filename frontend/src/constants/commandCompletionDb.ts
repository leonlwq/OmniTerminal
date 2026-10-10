// 终端智能补全上下文感知命令库与匹配引擎 (Context-Aware IntelliSense Engine)

export interface CommandContextMeta {
  root: string;
  subcommands: string[];
  flags: string[];
  nested?: Record<string, { subcommands?: string[]; flags?: string[] }>;
}

export const COMMAND_CONTEXT_DB: Record<string, CommandContextMeta> = {
  git: {
    root: 'git',
    subcommands: [
      'status', 'add', 'commit', 'push', 'pull', 'checkout', 'branch',
      'merge', 'rebase', 'stash', 'log', 'diff', 'clone', 'remote',
      'fetch', 'tag', 'reset', 'revert', 'cherry-pick', 'init', 'switch', 'restore', 'show'
    ],
    flags: ['--help', '--version', '-v', '-C'],
    nested: {
      commit: { flags: ['-m ""', '-am ""', '--amend', '--no-verify', '-s'] },
      push: { subcommands: ['origin main', 'origin master', 'origin', 'upstream'], flags: ['-u origin main', '--force', '--all', '--tags', '--set-upstream'] },
      pull: { subcommands: ['origin main', 'origin master', 'origin', 'upstream'], flags: ['--rebase', '--autostash'] },
      checkout: { flags: ['-b', '-B', '--track', 'main', 'master', 'develop'] },
      branch: { flags: ['-a', '-r', '-d', '-D', '-m', '--set-upstream-to'] },
      status: { flags: ['-s', '--short', '--branch'] },
      log: { flags: ['--oneline -n 10', '-p', '--graph --decorate --oneline', '--stat'] },
      stash: { subcommands: ['pop', 'push', 'list', 'apply', 'drop', 'clear', 'show'] },
      remote: { subcommands: ['-v', 'add origin', 'remove', 'rename', 'show origin', 'prune'] },
      diff: { flags: ['--staged', '--cached', '--stat', 'HEAD'] },
      reset: { flags: ['--hard HEAD~1', '--soft HEAD~1', '--mixed', 'HEAD'] },
      add: { subcommands: ['.', '-A', '-u', '-p'] },
      clone: { flags: ['--depth 1', '--recursive', '--branch'] },
    },
  },
  docker: {
    root: 'docker',
    subcommands: [
      'ps', 'images', 'run', 'exec', 'logs', 'build', 'stop', 'start', 'restart',
      'rm', 'rmi', 'pull', 'push', 'compose', 'network', 'volume', 'inspect',
      'tag', 'login', 'logout', 'system', 'stats', 'top', 'cp'
    ],
    flags: ['--help', '--version'],
    nested: {
      ps: { flags: ['-a', '-q', '--format "{{.ID}}: {{.Names}} ({{.Status}})"', '--filter'] },
      images: { flags: ['-a', '-q', '--digests'] },
      run: { flags: ['-d -p 8080:80', '-it --rm', '-v $(pwd):/app', '--name', '--restart=always', '-e NODE_ENV=production'] },
      exec: { flags: ['-it bash', '-it sh', '-u root'] },
      logs: { flags: ['-f --tail 100', '-f', '--since 1h', '-t'] },
      build: { flags: ['-t app:latest .', '-f Dockerfile .', '--no-cache .', '--build-arg'] },
      compose: { subcommands: ['up -d', 'down', 'logs -f', 'ps', 'build', 'restart', 'stop', 'start', 'exec', 'pull', 'config'], flags: ['-d', '-f docker-compose.yml', '--build', '-v'] },
      network: { subcommands: ['ls', 'create', 'rm', 'inspect', 'prune'] },
      volume: { subcommands: ['ls', 'create', 'rm', 'inspect', 'prune'] },
      system: { subcommands: ['prune -af', 'df', 'info', 'events'] },
    },
  },
  kubectl: {
    root: 'kubectl',
    subcommands: [
      'get', 'describe', 'logs', 'exec', 'apply', 'delete', 'create', 'scale',
      'rollout', 'port-forward', 'top', 'cluster-info', 'config', 'drain', 'cordon', 'edit'
    ],
    flags: ['--help', '-n', '-A', '--all-namespaces', '-o wide', '-o yaml', '-o json', '-l'],
    nested: {
      get: { subcommands: ['pods -A', 'pods', 'services', 'deployments', 'nodes', 'namespaces', 'ingress', 'configmaps', 'secrets', 'pvc', 'events --sort-by=.metadata.creationTimestamp'], flags: ['-A', '-n kube-system', '-o wide', '-w'] },
      describe: { subcommands: ['pod', 'service', 'deployment', 'node', 'ingress', 'configmap'] },
      logs: { flags: ['-f --tail=100', '-f', '-p', '-c'] },
      exec: { flags: ['-it -- /bin/bash', '-it -- /bin/sh'] },
      apply: { flags: ['-f k8s/', '-f deployment.yaml', '-k .'] },
      delete: { subcommands: ['pod', 'service', 'deployment', 'configmap'], flags: ['-f', '--grace-period=0 --force'] },
      rollout: { subcommands: ['restart deployment', 'status deployment', 'history deployment', 'undo deployment'] },
      scale: { flags: ['deployment --replicas=3'] },
      config: { subcommands: ['get-contexts', 'use-context', 'view', 'current-context'] },
      top: { subcommands: ['nodes', 'pods'] },
    },
  },
  npm: {
    root: 'npm',
    subcommands: [
      'install', 'run', 'test', 'build', 'init', 'publish', 'uninstall',
      'update', 'audit', 'ls', 'outdated', 'cache', 'link', 'version', 'info'
    ],
    flags: ['--save-dev', '-D', '-g', '--force', '--legacy-peer-deps', '-v'],
    nested: {
      run: { subcommands: ['dev', 'build', 'test', 'lint', 'start', 'preview'] },
      install: { flags: ['-D', '--save-dev', '-g', '--legacy-peer-deps'] },
      audit: { subcommands: ['fix', 'fix --force'] },
      cache: { subcommands: ['clean --force'] },
    },
  },
  yarn: {
    root: 'yarn',
    subcommands: ['add', 'remove', 'install', 'dev', 'build', 'test', 'start', 'lint', 'upgrade', 'why'],
    flags: ['-D', '--dev', '-g', '--force'],
  },
  pnpm: {
    root: 'pnpm',
    subcommands: ['install', 'add', 'remove', 'run', 'dev', 'build', 'test', 'start', 'update', 'audit'],
    flags: ['-D', '-w', '-r'],
  },
  systemctl: {
    root: 'systemctl',
    subcommands: [
      'status', 'restart', 'stop', 'start', 'reload', 'enable', 'disable',
      'daemon-reload', 'is-active', 'is-enabled', 'list-units --type=service', 'list-unit-files'
    ],
    flags: ['--no-pager', '-l', '--failed', '--type=service'],
  },
  journalctl: {
    root: 'journalctl',
    subcommands: [],
    flags: ['-u', '-f', '-n 100', '-xe', '--no-pager', '-b', '--since "1 hour ago"'],
  },
  curl: {
    root: 'curl',
    subcommands: [],
    flags: ['-fsSL', '-v', '-X POST', '-X GET', '-H "Content-Type: application/json"', '-d \'\'', '-o output.txt', '-O', '-k', '-I'],
  },
  tar: {
    root: 'tar',
    subcommands: [],
    flags: ['-czvf archive.tar.gz', '-xzvf archive.tar.gz', '-tzvf archive.tar.gz', '-C /tmp'],
  },
  find: {
    root: 'find',
    subcommands: ['. -name ""', '/var/log -name "*.log"', '. -type f -mtime -1', '. -type d'],
    flags: ['-name', '-type f', '-type d', '-mtime -7', '-size +100M', '-exec rm -rf {} +', '-maxdepth 2'],
  },
  grep: {
    root: 'grep',
    subcommands: [],
    flags: ['-rn "TODO" .', '-rn', '-i', '-v', '-E', '-l', '-c', '-w', '-C 3'],
  },
};

// 通用 Linux 常用完整命令预置
export const COMMON_COMMANDS = [
  'ls -la',
  'ls -lh',
  'cd ..',
  'cd ~',
  'pwd',
  'git status',
  'git log --oneline -n 10',
  'git diff',
  'git pull',
  'git push',
  'git checkout main',
  'git checkout -b ',
  'docker ps',
  'docker ps -a',
  'docker compose up -d',
  'docker compose logs -f',
  'docker compose down',
  'kubectl get pods -A',
  'kubectl get nodes',
  'systemctl status ',
  'systemctl restart ',
  'systemctl daemon-reload',
  'journalctl -xe -f',
  'df -h',
  'free -m',
  'top',
  'htop',
  'ps aux | grep ',
  'netstat -tlpn',
  'ss -tulpn',
  'curl -fsSL ',
  'tail -f /var/log/syslog',
  'tail -f /var/log/nginx/error.log',
  'npm run dev',
  'npm run build',
  'npm test',
  'pnpm dev',
  'yarn dev',
  'cat /etc/os-release',
  'uname -a',
  'history | tail -20',
  'chmod +x ',
  'chmod 755 ',
  'chown -R ',
  'tar -czvf ',
  'tar -xzvf ',
  'ping -c 4 8.8.8.8',
  'traceroute ',
];

/**
 * 智能上下文感知补全匹配算法
 * @param inputBuffer 用户当前终端输入的完整字符缓冲区
 * @param history 当前会话的历史命令列表
 * @returns 补全建议后缀（即除去 inputBuffer 后的 ghost text），若无合适匹配则返回 null
 */
export function getContextAwareSuggestion(
  inputBuffer: string,
  history: string[] = []
): string | null {
  if (!inputBuffer) return null;
  const trimmedLeft = inputBuffer.trimStart();
  if (trimmedLeft.length < 2) return null;

  const endsWithSpace = inputBuffer.endsWith(' ');
  const tokens = trimmedLeft.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const root = tokens[0].toLowerCase();
  const meta = COMMAND_CONTEXT_DB[root];

  // 1. 如果匹配到支持上下文感知的命令工具 (如 git, docker, kubectl, npm 等)
  if (meta) {
    // 场景 A: 仅输入了根命令，如 "git " 或 "git p"
    if (tokens.length === 1 && endsWithSpace) {
      // 用户刚敲了 "git "，优先推荐该工具最常用的首个子命令
      const defaultSub = meta.subcommands[0];
      if (defaultSub) {
        return defaultSub;
      }
    } else if (tokens.length === 2 && !endsWithSpace) {
      // 用户正在输入子命令前缀，如 "git pu" -> 寻找以 "pu" 开头的子命令
      const subPrefix = tokens[1].toLowerCase();
      const matchedSub = meta.subcommands.find(s => s.toLowerCase().startsWith(subPrefix) && s.length > subPrefix.length);
      if (matchedSub) {
        return matchedSub.slice(subPrefix.length);
      }
      // 也匹配通用 flags
      const matchedFlag = meta.flags.find(f => f.toLowerCase().startsWith(subPrefix) && f.length > subPrefix.length);
      if (matchedFlag) {
        return matchedFlag.slice(subPrefix.length);
      }
    } else if (tokens.length >= 2) {
      // 场景 B: 用户已经输入了二级命令，检查是否有嵌套子命令，如 "docker compose " 或 "git commit "
      const sub = tokens[1].toLowerCase();
      const nestedMeta = meta.nested?.[sub];
      if (nestedMeta) {
        if (tokens.length === 2 && endsWithSpace) {
          // 用户刚敲完 "docker compose "
          const defaultNested = nestedMeta.subcommands?.[0] || nestedMeta.flags?.[0];
          if (defaultNested) {
            return defaultNested;
          }
        } else if (tokens.length === 3 && !endsWithSpace) {
          // 用户输入如 "docker compose u" -> 补全 "up -d"
          const nestedPrefix = tokens[2].toLowerCase();
          const matched = nestedMeta.subcommands?.find(s => s.toLowerCase().startsWith(nestedPrefix) && s.length > nestedPrefix.length)
            || nestedMeta.flags?.find(f => f.toLowerCase().startsWith(nestedPrefix) && f.length > nestedPrefix.length);
          if (matched) {
            return matched.slice(nestedPrefix.length);
          }
        }
      }
      // 检查根命令二级标志
      if (endsWithSpace && meta.nested?.[sub]?.flags?.length) {
        const flag = meta.nested[sub].flags![0];
        return flag;
      }
    }
  }

  // 2. 如果上下文匹配无结果，查询会话最近历史记录（从最新往前查）
  const bufLower = inputBuffer.toLowerCase();
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    if (item && item.toLowerCase().startsWith(bufLower) && item.length > inputBuffer.length) {
      return item.slice(inputBuffer.length);
    }
  }

  // 3. 最后查询内置常用全量预置命令库
  const commonMatch = COMMON_COMMANDS.find(
    c => c.toLowerCase().startsWith(bufLower) && c.length > inputBuffer.length
  );
  if (commonMatch) {
    return commonMatch.slice(inputBuffer.length);
  }

  return null;
}
