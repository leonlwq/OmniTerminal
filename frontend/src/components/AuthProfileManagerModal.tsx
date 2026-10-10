import React, { useState, useEffect } from 'react';
import { GetAuthProfiles, SaveAuthProfile, DeleteAuthProfile } from '../../wailsjs/go/app/App';
import { models } from '../../wailsjs/go/models';
import { X, Plus, Trash2, Save, UserCheck, Shield } from 'lucide-react';

interface AuthProfileManagerModalProps {
  onClose: () => void;
}

export const AuthProfileManagerModal: React.FC<AuthProfileManagerModalProps> = ({ onClose }) => {
  const [profiles, setProfiles] = useState<models.AuthProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<models.AuthProfile>>({});

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    GetAuthProfiles()
      .then(p => setProfiles(p || []))
      .catch(err => alert("无法加载认证档案: " + err));
  };

  const handleAddNew = () => {
    setEditingId('new');
    setFormData({ id: '', name: '新的认证档案', user: '', password: '', privateKey: '' });
  };

  const handleEdit = (p: models.AuthProfile) => {
    setEditingId(p.id);
    setFormData(p);
  };

  const handleSave = () => {
    if (!formData.name) {
      alert("请输入档案名称");
      return;
    }
    SaveAuthProfile(formData as models.AuthProfile)
      .then(() => {
        setEditingId(null);
        loadProfiles();
      })
      .catch(err => alert("保存失败: " + err));
  };

  const handleDelete = (id: string) => {
    if (confirm("确定要删除此认证档案吗？所有使用此档案的会话将无法认证。")) {
      DeleteAuthProfile(id)
        .then(loadProfiles)
        .catch(err => alert("删除失败: " + err));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-full max-w-3xl flex flex-col overflow-hidden h-[560px] text-[#cccccc]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#e0e0e0] leading-tight">集中认证档案管理</h2>
              <span className="text-[11px] text-[#858585] font-normal">Authentication Profiles & Reusable Credentials</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#858585] hover:text-white rounded p-1 hover:bg-[#333333] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* List Sidebar */}
          <div className="w-64 border-r border-[#2b2b2b] bg-[#181818] flex flex-col p-2.5 space-y-2 shrink-0">
            <button 
              onClick={handleAddNew}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] rounded text-xs font-medium text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> 新建凭据档案
            </button>
            <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
              {profiles.map(p => (
                <div 
                  key={p.id}
                  className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer rounded-r transition-colors text-xs border-l-2 ${
                    editingId === p.id 
                      ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                      : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white border-l-transparent'
                  }`}
                  onClick={() => handleEdit(p)}
                >
                  <span className="truncate pr-2">{p.name}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#858585] hover:text-red-400 hover:bg-[#333333] rounded transition-colors shrink-0"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {profiles.length === 0 && (
                <div className="p-6 text-center text-xs text-[#858585]">
                  暂无认证档案
                </div>
              )}
            </div>
          </div>

          {/* Edit Form */}
          <div className="flex-1 bg-[#1e1e1e] p-6 overflow-y-auto">
            {editingId ? (
              <div className="space-y-4 max-w-xl">
                <h3 className="text-xs font-semibold text-[#e0e0e0] mb-2">
                  {editingId === 'new' ? '新建认证凭据档案' : `编辑凭据: ${formData.name || ''}`}
                </h3>
                
                <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3.5 shadow-sm">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">档案显示名称 *</label>
                    <input 
                      type="text" 
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="如: 阿里云生产节点统一认证"
                      className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">登录用户名</label>
                      <input 
                        type="text" 
                        value={formData.user || ''}
                        onChange={(e) => setFormData({...formData, user: e.target.value})}
                        placeholder="root, ubuntu 等"
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#858585]">登录密码 (可选)</label>
                      <input 
                        type="password" 
                        value={formData.password || ''}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="输入加密保存的密码"
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-[#858585]">SSH 私钥内容 (可选，PEM/OpenSSH 格式)</label>
                    <textarea 
                      value={formData.privateKey || ''}
                      onChange={(e) => setFormData({...formData, privateKey: e.target.value})}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                      className="w-full h-32 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono resize-none outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs font-semibold rounded transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" /> 保存认证档案
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#858585] text-center">
                <div className="w-12 h-12 rounded-lg bg-[#252526] border border-[#2b2b2b] flex items-center justify-center text-[#0078d4] mb-3">
                  <UserCheck className="w-6 h-6" />
                </div>
                <p className="text-xs text-[#858585] font-medium">在左侧列表选择凭据进行编辑，或点击“新建凭据档案”</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

