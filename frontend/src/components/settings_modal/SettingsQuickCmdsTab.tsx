import React, { useState } from 'react';
import { Command, Folder, Plus, X, Trash2 } from 'lucide-react';
import { models } from '../../../wailsjs/go/models';
import { SaveSettings } from '../../../wailsjs/go/app/App';
import { useI18n } from '../../i18n/I18nContext';

interface SettingsQuickCmdsTabProps {
  settings: models.AppSettings;
  setSettings: (s: models.AppSettings) => void;
}

export function SettingsQuickCmdsTab({
  settings,
  setSettings,
}: SettingsQuickCmdsTabProps) {
  const { t } = useI18n();
  const [newSetName, setNewSetName] = useState('');
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [newCmdLabel, setNewCmdLabel] = useState('');
  const [newCmdText, setNewCmdText] = useState('');

  const handleCreateCmdSet = (isFolder: boolean) => {
    if (!newSetName.trim()) return;
    let targetParent = '';
    if (editingSetId) {
      const selected = (settings.quickCommandSets || []).find((s: models.QuickCommandSet) => s.id === editingSetId);
      if (selected && selected.isFolder) {
        targetParent = selected.id;
      } else if (selected) {
        targetParent = selected.parentId || '';
      }
    }
    const newSet = new models.QuickCommandSet({
      id: 'set_' + Date.now(),
      parentId: targetParent,
      isFolder: isFolder,
      setName: newSetName,
      commands: []
    });
    
    const updatedSets = [...(settings.quickCommandSets || []), newSet];
    const newSettings = new models.AppSettings({
      ...settings,
      quickCommandSets: updatedSets,
      activeCommandSetID: settings.activeCommandSetID || newSet.id
    });
    
    setSettings(newSettings);
    SaveSettings(newSettings).catch(() => {});
    setNewSetName('');
    setEditingSetId(newSet.id);
  };

  const renderCmdSetTree = (parentId: string, depth: number) => {
    return (settings.quickCommandSets || [])
      .filter((s: models.QuickCommandSet) => (s.parentId || '') === parentId)
      .map((set: models.QuickCommandSet) => (
        <div key={set.id} className="w-full">
          <div 
            onClick={() => setEditingSetId(set.id)}
            className={`flex items-center justify-between py-1.5 px-2.5 rounded cursor-pointer transition-all text-xs ${
              editingSetId === set.id 
                ? 'bg-[#04395e] text-white font-medium border border-[#0078d4]' 
                : 'hover:bg-[#2a2d2e] text-[#cccccc] border border-transparent'
            }`}
            style={{ marginLeft: `${depth * 10}px` }}
          >
            <span className="truncate flex items-center space-x-1.5">
              <span>{set.isFolder ? '📁' : '📄'}</span>
              <span>{set.setName}</span>
            </span>
            <button 
              onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCmdSet(set.id);
              }}
              className="p-1 text-[#858585] hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {set.isFolder && renderCmdSetTree(set.id, depth + 1)}
        </div>
      ));
  };

  const handleDeleteCmdSet = (setId: string) => {
    const updatedSets = (settings.quickCommandSets || []).filter((s: models.QuickCommandSet) => s.id !== setId);
    let activeId = settings.activeCommandSetID;
    if (activeId === setId) {
      activeId = updatedSets.length > 0 ? updatedSets[0].id : '';
    }
    const newSettings = new models.AppSettings({
      ...settings,
      quickCommandSets: updatedSets,
      activeCommandSetID: activeId
    });
    setSettings(newSettings);
    SaveSettings(newSettings).catch(() => {});
    if (editingSetId === setId) setEditingSetId(null);
  };

  const handleAddCmdToSet = () => {
    if (!editingSetId || !newCmdLabel.trim() || !newCmdText.trim()) return;
    
    const sets = [...(settings.quickCommandSets || [])];
    const targetSet = sets.find((s: models.QuickCommandSet) => s.id === editingSetId);
    if (targetSet) {
      const newCmd = new models.QuickCommand({
        label: newCmdLabel,
        cmd: newCmdText
      });
      targetSet.commands = [...(targetSet.commands || []), newCmd];
      
      const newSettings = new models.AppSettings({
        ...settings,
        quickCommandSets: sets
      });
      setSettings(newSettings);
      SaveSettings(newSettings).catch(() => {});
      setNewCmdLabel('');
      setNewCmdText('');
    }
  };

  const handleDeleteCmdFromSet = (cmdIdx: number) => {
    if (!editingSetId) return;
    const sets = [...(settings.quickCommandSets || [])];
    const targetSet = sets.find((s: models.QuickCommandSet) => s.id === editingSetId);
    if (targetSet) {
      targetSet.commands = (targetSet.commands || []).filter((_: any, idx: number) => idx !== cmdIdx);
      const newSettings = new models.AppSettings({
        ...settings,
        quickCommandSets: sets
      });
      setSettings(newSettings);
      SaveSettings(newSettings).catch(() => {});
    }
  };

  const currentEditingSet = (settings.quickCommandSets || []).find((s: models.QuickCommandSet) => s.id === editingSetId);

  return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 h-[420px] overflow-hidden">
                  
                  {/* Left Column: Sets Tree */}
                  <div className="border border-[#2b2b2b] rounded-md p-3.5 flex flex-col bg-[#252526] shadow-sm">
                    <h4 className="font-semibold text-xs text-[#cccccc] mb-2 shrink-0">{t('settings.quickCmds.title') || '所有快捷命令方案'}</h4>
                    <div className="flex space-x-1.5 mb-3 shrink-0">
                      <input 
                        type="text" 
                        placeholder={t('settings.quickCmds.placeholderName') || '方案名称...'}
                        value={newSetName}
                        onChange={(e) => setNewSetName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] min-w-0 outline-none"
                      />
                      <button 
                        onClick={() => handleCreateCmdSet(true)}
                        className="px-2.5 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] border border-[#3c3c3c] rounded text-[#cccccc] text-xs font-medium whitespace-nowrap transition-colors"
                        title={t('settings.quickCmds.newFolderTitle') || '新建文件夹'}
                      >
                        {t('settings.quickCmds.newFolder') || '+ 目录'}
                      </button>
                      <button 
                        onClick={() => handleCreateCmdSet(false)}
                        className="px-2.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] rounded text-white text-xs font-medium whitespace-nowrap transition-colors shadow-sm"
                        title={t('settings.quickCmds.newSetTitle') || '新建命令集'}
                      >
                        {t('settings.quickCmds.newSet') || '+ 集合'}
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                      {(settings.quickCommandSets || []).length === 0 ? (
                        <p className="text-[#858585] text-center py-6 text-xs">{t('settings.quickCmds.emptySets') || '暂无快捷方案'}</p>
                      ) : (
                        renderCmdSetTree('', 0)
                      )}
                    </div>
                  </div>

                  {/* Right Column: Active Set Commands */}
                  <div className="border border-[#2b2b2b] rounded-md p-3.5 flex flex-col bg-[#252526] shadow-sm">
                    {editingSetId ? (
                      <>
                        <h4 className="font-semibold text-xs text-[#cccccc] mb-2 shrink-0 flex items-center justify-between">
                          <span>{currentEditingSet?.isFolder ? (t('settings.quickCmds.folderLabel') || '📁 文件夹') : (t('settings.quickCmds.setLabel') || '⚡ 方案内容')}: { currentEditingSet?.setName }</span>
                        </h4>
                        
                        {currentEditingSet?.isFolder ? (
                          <div className="flex-1 flex items-center justify-center text-[#858585] text-center p-4 text-xs">
                            {t('settings.quickCmds.folderHint') || '这是一个方案分组文件夹。请在左侧选中具体命令集或新建子集。'}
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2 mb-3 shrink-0 p-2.5 bg-[#1e1e1e] border border-[#3c3c3c] rounded-md">
                              <input 
                                type="text" 
                                placeholder={t('settings.quickCmds.labelPlaceholder') || '快捷标签 (如: 重启 Nginx)'}
                                value={newCmdLabel}
                                onChange={(e) => setNewCmdLabel(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                              />
                              <input 
                                type="text" 
                                placeholder={t('settings.quickCmds.cmdPlaceholder') || '指令内容 (如: systemctl restart nginx)'}
                                value={newCmdText}
                                onChange={(e) => setNewCmdText(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono outline-none"
                              />
                              <button 
                                onClick={handleAddCmdToSet}
                                className="w-full py-1.5 bg-[#0078d4] hover:bg-[#006cbe] rounded text-white text-xs font-medium shadow-sm transition-all"
                              >
                                {t('settings.quickCmds.addBtn') || '+ 添加命令到当前方案'}
                              </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                              {(currentEditingSet?.commands || []).length === 0 ? (
                                <p className="text-[#858585] text-center py-6 text-xs">{t('settings.quickCmds.emptyCmds') || '暂无按键指令，请在上方添加'}</p>
                              ) : (
                                (currentEditingSet?.commands || []).map((cmd: models.QuickCommand, idx: number) => (
                                  <div 
                                    key={idx}
                                    className="flex items-center justify-between p-2 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#505050] rounded transition-colors"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-[#cccccc] text-xs">{cmd.label}</p>
                                      <p className="text-[10px] text-[#858585] font-mono truncate">{cmd.cmd}</p>
                                    </div>
                                    <button 
                                      onClick={() => handleDeleteCmdFromSet(idx)}
                                      className="p-1 text-[#858585] hover:text-red-400 hover:bg-red-500/10 rounded shrink-0 ml-2 transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-[#858585] text-center p-4 text-xs">
                        {t('settings.quickCmds.noSelection') || '请在左侧选择或新建一个方案，以开始定制快捷按键'}
                      </div>
                    )}
                  </div>

                </div>
              </div>
  );
}
