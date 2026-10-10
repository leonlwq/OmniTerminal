import React, { useState, useEffect } from 'react';
import { models } from '../../wailsjs/go/models';
import { SaveSettings, WriteSSH } from '../../wailsjs/go/app/App';

interface UseMacroManagerOptions {
  settings: models.AppSettings;
  setSettings: (settings: models.AppSettings) => void;
  activeTabId: string | null;
  terminalCastRecordings?: Record<string, () => string>;
  setActiveCastContent: (content: string) => void;
  setIsCastPlayerOpen: (open: boolean) => void;
}

export function useMacroManager({
  settings,
  setSettings,
  activeTabId,
  terminalCastRecordings,
  setActiveCastContent,
  setIsCastPlayerOpen,
}: UseMacroManagerOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [macroStartTime, setMacroStartTime] = useState<number>(0);
  const [tempMacroActions, setTempMacroActions] = useState<models.MacroAction[]>([]);
  const [selectedMacroId, setSelectedMacroId] = useState('');
  const [isSaveMacroModalOpen, setIsSaveMacroModalOpen] = useState(false);
  const [macroNameInput, setMacroNameInput] = useState('');
  const [macroSeconds, setMacroSeconds] = useState(0);
  const [macroToDelete, setMacroToDelete] = useState<models.AppMacro | null>(null);

  // 宏录制秒数计时器
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      setMacroSeconds(0);
      timer = setInterval(() => {
        setMacroSeconds(s => s + 1);
      }, 1000);
    } else {
      setMacroSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  // 宏录制按键监听
  useEffect(() => {
    const handleRecordChar = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const charBase64 = customEvent.detail;
      if (isRecording) {
        const offset = Date.now() - macroStartTime;
        const action = new models.MacroAction({
          timeOffset: offset,
          data: charBase64
        });
        setTempMacroActions(prev => [...prev, action]);
      }
    };

    window.addEventListener('macro-record-char', handleRecordChar);
    return () => {
      window.removeEventListener('macro-record-char', handleRecordChar);
    };
  }, [isRecording, macroStartTime]);

  const startRecordingMacro = () => {
    if (isRecording) return;
    if (!activeTabId) {
      alert("请先选中一个终端页签后再开始录制宏");
      return;
    }
    setIsRecording(true);
    setMacroStartTime(Date.now());
    setTempMacroActions([]);
  };

  const stopRecordingMacro = () => {
    setIsRecording(false);
    // 检查是否有 Asciinema 会话录像数据
    if (activeTabId && terminalCastRecordings && terminalCastRecordings[activeTabId]) {
      const castStr = terminalCastRecordings[activeTabId]();
      if (castStr && castStr.split('\n').length > 1) {
        setActiveCastContent(castStr);
        setIsCastPlayerOpen(true);
      }
    }

    if (tempMacroActions.length > 0) {
      setMacroNameInput('');
      setIsSaveMacroModalOpen(true);
    }
  };

  const saveRecordedMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!macroNameInput.trim()) return;

    const newMacro = new models.AppMacro({
      id: 'macro_' + Date.now(),
      name: macroNameInput.trim(),
      actions: tempMacroActions
    });

    const updatedMacros = [...(settings.macros || []), newMacro];
    const newSettings = new models.AppSettings({
      ...settings,
      macros: updatedMacros
    });

    setSettings(newSettings);
    SaveSettings(newSettings)
      .then(() => {
        setIsSaveMacroModalOpen(false);
        setSelectedMacroId(newMacro.id);
      })
      .catch(err => {
        alert("保存宏方案失败: " + err);
      });
  };

  const playMacro = () => {
    if (!selectedMacroId) return;
    if (!activeTabId) {
      alert("请激活一个用于回放宏的终端页签");
      return;
    }

    const macro = (settings.macros || []).find(m => m.id === selectedMacroId);
    if (!macro) return;

    (macro.actions || []).forEach((action: models.MacroAction) => {
      setTimeout(() => {
        WriteSSH(activeTabId, action.data).catch(() => { });
      }, action.timeOffset);
    });
  };

  const confirmDeleteMacro = () => {
    if (!macroToDelete) return;
    const updated = (settings.macros || []).filter((m: models.AppMacro) => m.id !== macroToDelete.id);
    const newSettings = new models.AppSettings({
      ...settings,
      macros: updated
    });
    setSettings(newSettings);
    SaveSettings(newSettings).catch(() => { });
    if (selectedMacroId === macroToDelete.id) {
      setSelectedMacroId('');
    }
    setMacroToDelete(null);
  };

  const formatMacroTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    macroSeconds,
    selectedMacroId,
    setSelectedMacroId,
    isSaveMacroModalOpen,
    setIsSaveMacroModalOpen,
    macroNameInput,
    setMacroNameInput,
    macroToDelete,
    setMacroToDelete,
    startRecordingMacro,
    stopRecordingMacro,
    saveRecordedMacro,
    playMacro,
    confirmDeleteMacro,
    formatMacroTime,
    tempMacroActionCount: tempMacroActions.length,
  };
}
