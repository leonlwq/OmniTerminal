import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { GenerateKeyPair, GetIdentityKeys, SaveIdentityKey, DeleteIdentityKey } from '../../wailsjs/go/app/App';
import { models } from '../../wailsjs/go/models';
import { X, Plus, Trash2, Save, Key, FileUp, Sparkles, Shield } from 'lucide-react';

interface KeyManagerModalProps {
  onClose: () => void;
}

export const KeyManagerModal: React.FC<KeyManagerModalProps> = ({ onClose }) => {
  const { t } = useI18n();
  const [keys, setKeys] = useState<models.IdentityKey[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<models.IdentityKey>>({});
  const [keyType, setKeyType] = useState('ed25519');
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = () => {
    GetIdentityKeys()
      .then(k => setKeys(k || []))
      .catch(err => setErrorMsg((t('key.loadError') || "无法加载全局密钥: ") + err));
  };

  const handleAddNew = () => {
    setEditingId('new');
    setFormData({ id: '', name: t('key.newProfileDefault') || '新的全局密钥', privateKey: '', publicKey: '' });
    setErrorMsg('');
  };

  const handleEdit = (k: models.IdentityKey) => {
    setEditingId(k.id);
    setFormData(k);
    setErrorMsg('');
  };

  const handleSave = () => {
    if (!formData.name) {
      setErrorMsg(t('key.nameRequired') || "请输入密钥名称");
      return;
    }
    if (!formData.privateKey) {
      setErrorMsg(t('key.privateKeyRequired') || "私钥内容不能为空");
      return;
    }
    SaveIdentityKey(formData as models.IdentityKey)
      .then(() => {
        setEditingId(null);
        loadKeys();
      })
      .catch(err => setErrorMsg((t('key.saveError') || "保存失败: ") + err));
  };

  const handleDelete = (id: string) => {
    if (confirm(t('key.deleteConfirm') || "确定要删除此全局密钥吗？依赖此密钥的会话将无法连接。")) {
      DeleteIdentityKey(id)
        .then(() => {
          if (editingId === id) setEditingId(null);
          loadKeys();
        })
        .catch(err => setErrorMsg((t('key.deleteError') || "删除失败: ") + err));
    }
  };

  const handleGenerate = () => {
    setGenerating(true);
    setErrorMsg('');
    GenerateKeyPair(keyType)
      .then((res: any) => {
        setFormData({
          ...formData,
          privateKey: res?.privateKey || '',
          publicKey: res?.publicKey || ''
        });
      })
      .catch(err => {
        setErrorMsg((t('key.genError') || "生成密钥对失败: ") + err);
      })
      .finally(() => {
        setGenerating(false);
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setFormData({ ...formData, privateKey: content });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-[#252526] border border-[#2b2b2b] shadow-[0_16px_36px_rgba(0,0,0,0.65)] rounded-lg w-full max-w-4xl flex flex-col h-[600px] overflow-hidden text-[#cccccc]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#1f1f1f] border-b border-[#2b2b2b] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-[#0078d4]">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#e0e0e0] leading-tight">{t('key.title') || '全局 SSH 密钥管理器'}</h2>
              <span className="text-[11px] text-[#858585] font-normal">{t('key.subtitle') || 'Global SSH Key Pair & Identity Profiles'}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#858585] hover:text-white rounded p-1 hover:bg-[#333333] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar list */}
          <div className="w-64 border-r border-[#2b2b2b] bg-[#181818] flex flex-col shrink-0 p-2.5 space-y-2">
            <button
              onClick={handleAddNew}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs font-medium rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('key.newBtn') || '导入 / 生成新密钥'}</span>
            </button>
            
            <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
              {keys.length === 0 ? (
                <div className="text-center p-6 text-xs text-[#858585]">{t('key.emptyList') || '暂无已保存的全局密钥'}</div>
              ) : (
                keys.map(k => (
                  <div
                    key={k.id}
                    className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer rounded-r group transition-colors text-xs border-l-2 ${
                      editingId === k.id 
                        ? 'bg-[#04395e] text-white border-l-[#0078d4] font-semibold' 
                        : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white border-l-transparent'
                    }`}
                    onClick={() => handleEdit(k)}
                  >
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      <Key className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{k.name}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(k.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#858585] hover:text-red-400 hover:bg-[#333333] rounded transition-colors shrink-0"
                      title={t('key.delete') || '删除'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Editor area */}
          <div className="flex-1 bg-[#1e1e1e] flex flex-col overflow-hidden">
            {editingId ? (
              <div className="flex flex-col h-full">
                <div className="px-5 py-2.5 border-b border-[#2b2b2b] bg-[#1f1f1f] flex items-center justify-between shrink-0">
                  <h3 className="text-xs font-semibold text-[#e0e0e0]">
                    {editingId === 'new' ? (t('key.createProfile') || '创建 / 导入全局密钥档案') : (t('key.editProfile') || '编辑密钥: {name}').replace('{name}', formData.name || '')}
                  </h3>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbe] text-white text-xs font-semibold rounded transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {t('key.saveBtn') || '保存密钥'}
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {errorMsg && (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 text-red-300 text-xs rounded">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-2 shadow-sm">
                      <label className="text-[11px] font-medium text-[#858585]">{t('key.profileNameLabel') || '密钥档案名称 *'}</label>
                      <input
                        type="text"
                        placeholder={t('key.profileNamePlaceholder') || '例如: 生产跳板机专用 ED25519 密钥'}
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none transition-colors"
                      />
                    </div>

                    <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-2.5">
                        <span className="text-xs font-semibold text-[#e0e0e0] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#0078d4]" />
                          {t('key.genSectionTitle') || '生成全新高强度密钥对'}
                        </span>
                        <div className="flex gap-2 items-center">
                          <select 
                            value={keyType}
                            onChange={(e) => setKeyType(e.target.value)}
                            className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] outline-none"
                          >
                            <option value="ed25519">ED25519 (现代极速推荐)</option>
                            <option value="ecdsa-p256">ECDSA 256-bit (NIST P-256)</option>
                            <option value="ecdsa-p384">ECDSA 384-bit (NIST P-384)</option>
                            <option value="ecdsa-p521">ECDSA 521-bit (NIST P-521)</option>
                            <option value="rsa">RSA 4096-bit</option>
                          </select>
                          <button 
                            onClick={handleGenerate}
                            disabled={generating}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                              generating ? 'bg-[#0078d4]/50 text-white/50 cursor-not-allowed' : 'bg-[#0078d4] hover:bg-[#006cbe] text-white'
                            }`}
                          >
                            {generating ? (t('key.generating') || '正在生成...') : (t('key.genBtn') || '立即生成并填充')}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-medium text-[#858585]">{t('key.importLocalTitle') || '或直接导入本地私钥文件 (PEM / OpenSSH)'}</span>
                        <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#484848] text-[#cccccc] text-xs font-medium rounded transition-colors">
                          <FileUp className="w-3.5 h-3.5 text-[#0078d4]" />
                          <span>{t('key.browseFile') || '浏览文件...'}</span>
                          <input type="file" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </div>

                    <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-4 space-y-2 shadow-sm">
                      <label className="text-[11px] font-medium text-[#858585]">{t('key.privateKeyLabel') || '私钥内容 (PEM / OpenSSH Key) *'}</label>
                      <textarea
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                        value={formData.privateKey || ''}
                        onChange={e => setFormData({...formData, privateKey: e.target.value})}
                        className="w-full h-44 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252526] border border-[#3c3c3c] focus:border-[#0078d4] rounded text-xs text-[#cccccc] font-mono resize-none outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#858585] p-8 text-center">
                <div className="w-12 h-12 rounded-lg bg-[#252526] border border-[#2b2b2b] flex items-center justify-center text-[#0078d4] mb-3">
                  <Key className="w-6 h-6" />
                </div>
                <p className="text-xs text-[#858585] font-medium">{t('key.emptyDetails') || '请选择左侧的密钥档案进行编辑，或点击“导入 / 生成新密钥”'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
