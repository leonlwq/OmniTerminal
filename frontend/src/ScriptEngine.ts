import { WriteSSH } from '../wailsjs/go/app/App';
import { EventsOn, EventsOff } from '../wailsjs/runtime/runtime';
import { activeTerminals } from './components/TerminalInstance';

export async function runTerminalScript(scriptContent: string, tabId: string, onLog?: (msg: string) => void) {
  let outputBuffer = "";
  
  // Listen to terminal output
  const eventName = `ssh_output_${tabId}`;
  
  // 发送原始按键/文本到终端
  const sendText = async (text: string) => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Str = window.btoa(binary);
    await WriteSSH(tabId, base64Str);
  };

  const waitForString = (pattern: string, timeoutMs: number = 10000): Promise<string> => {
    return new Promise((resolve, reject) => {
      let isResolved = false;
      
      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`[xsh.Screen.WaitForString] 超时未匹配到期望字符串: "${pattern}" (${timeoutMs}ms)`));
        }
      }, timeoutMs);

      const checkMatch = () => {
        if (isResolved) return;
        try {
          const regex = new RegExp(pattern, "i");
          const match = outputBuffer.match(regex);
          if (match) {
            isResolved = true;
            clearTimeout(timer);
            const matchedStr = match[0];
            const matchIdx = outputBuffer.indexOf(matchedStr);
            outputBuffer = outputBuffer.substring(matchIdx + matchedStr.length);
            resolve(matchedStr);
          }
        } catch (e) {
          if (outputBuffer.includes(pattern)) {
            isResolved = true;
            clearTimeout(timer);
            const matchIdx = outputBuffer.indexOf(pattern);
            outputBuffer = outputBuffer.substring(matchIdx + pattern.length);
            resolve(pattern);
          }
        }
      };

      checkMatch();

      const pollTimer = setInterval(() => {
        if (isResolved) {
          clearInterval(pollTimer);
          return;
        }
        checkMatch();
      }, 50);
    });
  };

  // 标准 Xshell 8 xsh 对象命名空间
  const xsh = {
    Session: {
      Sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
      Log: (msg: string) => {
        if (onLog) onLog(msg);
        console.log(`[xsh.Session.Log] ${msg}`);
      },
      GetID: () => tabId,
    },
    Screen: {
      Send: sendText,
      WaitForString: waitForString,
      WaitForStrings: async (strArray: string[], timeoutMs: number = 10000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          for (let i = 0; i < strArray.length; i++) {
            if (outputBuffer.includes(strArray[i])) {
              const matched = strArray[i];
              const idx = outputBuffer.indexOf(matched);
              outputBuffer = outputBuffer.substring(idx + matched.length);
              return { matchedIndex: i, matchedString: matched };
            }
          }
          await new Promise(r => setTimeout(r, 50));
        }
        throw new Error(`[xsh.Screen.WaitForStrings] 超时未匹配到列表中的任何字符串`);
      },
      GetSelection: () => {
        const term = activeTerminals[tabId];
        return term ? term.getSelection() : '';
      },
      Clear: async () => {
        await sendText("\x1b[2J\x1b[H");
      }
    },
    Dialog: {
      MsgBox: (msg: string, title?: string) => {
        window.alert(title ? `[${title}]\n${msg}` : msg);
      },
      Prompt: (title: string, defaultVal: string = '') => {
        return window.prompt(title, defaultVal);
      }
    }
  };

  // 兼容 context 简易快捷调用
  const context = {
    send: sendText,
    sleep: xsh.Session.Sleep,
    expect: waitForString,
    xsh
  };

  // Setup the event listener to feed the buffer
  const cleanup = EventsOn(eventName, (base64Data: string) => {
    try {
      const binary = window.atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      outputBuffer += decoder.decode(bytes);
      if (outputBuffer.length > 100000) {
        outputBuffer = outputBuffer.slice(-50000);
      }
    } catch (e) {}
  });

  try {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const execute = new AsyncFunction('context', 'xsh', `
      with (context) {
        ${scriptContent}
      }
    `);
    
    await execute(context, xsh);
    return "脚本执行顺利完成 (Script executed successfully)";
  } finally {
    cleanup();
  }
}
