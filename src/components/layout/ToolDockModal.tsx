import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  Sparkles,
  Bot,
  Layers,
  Globe,
  Code,
  Terminal,
  Zap,
  Shield,
  AppWindow,
  Wrench,
  Folder,
  Trash2,
  Plus,
  Check,
  Search,
} from 'lucide-react';
import { ToolType, CreateToolInput } from '../../shared/types/toolDock';
import { useToolDockStore } from '../../stores/toolDockStore';
import { DetectInstalledAppsModal } from './DetectInstalledAppsModal';

const ICON_OPTIONS = [
  { id: 'Sparkles', name: 'Sparkles', icon: Sparkles },
  { id: 'Bot', name: 'Bot', icon: Bot },
  { id: 'Layers', name: 'Layers', icon: Layers },
  { id: 'Globe', name: 'Globe', icon: Globe },
  { id: 'Code', name: 'Code', icon: Code },
  { id: 'Terminal', name: 'Terminal', icon: Terminal },
  { id: 'Zap', name: 'Zap', icon: Zap },
  { id: 'Shield', name: 'Shield', icon: Shield },
  { id: 'AppWindow', name: 'AppWindow', icon: AppWindow },
  { id: 'Wrench', name: 'Wrench', icon: Wrench },
];

export const ToolDockModal: React.FC = () => {
  const { isModalOpen, editingTool, closeModal, addTool, updateTool, deleteTool } = useToolDockStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<ToolType>('website');
  const [target, setTarget] = useState('');
  const [icon, setIcon] = useState('Globe');
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [badge, setBadge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isDetectModalOpen, setIsDetectModalOpen] = useState(false);

  useEffect(() => {
    if (editingTool) {
      setName(editingTool.name);
      setType(editingTool.type); // Fixes Website vs Desktop tool type selection!
      setTarget(editingTool.target);
      setIcon(editingTool.icon || (editingTool.type === 'website' ? 'Globe' : 'AppWindow'));
      setCustomIconUrl(editingTool.customIconUrl || '');
      setBadge(editingTool.badge || '');
    } else {
      setName('');
      setType('website');
      setTarget('');
      setIcon('Globe');
      setCustomIconUrl('');
      setBadge('');
    }
    setErrorMsg(null);
  }, [editingTool, isModalOpen]);

  if (!isModalOpen) return null;

  const handleSelectExecutable = async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const filePath = await window.craftedAPI.selectExecutableFile();
      if (filePath) {
        setTarget(filePath);
        if (!name) {
          const filename = filePath.split(/[/\\]/).pop() || '';
          const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
          setName(nameWithoutExt);
        }
      }
    }
  };

  const handleSelectDiscoveredApp = (app: { name: string; target: string; icon: string; badge?: string }) => {
    setName(app.name);
    setTarget(app.target);
    setIcon(app.icon || 'AppWindow');
    if (app.badge) setBadge(app.badge);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Tool name is required');
      return;
    }
    if (!target.trim()) {
      setErrorMsg('Tool target (URL or application path) is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const inputData: CreateToolInput = {
      name: name.trim(),
      type,
      target: target.trim(),
      icon,
      customIconUrl: customIconUrl.trim() || undefined,
      badge: badge.trim() || undefined,
      itemOrder: editingTool ? editingTool.itemOrder : 99,
      openInBuiltInBrowser: true,
    };

    if (editingTool) {
      const res = await updateTool(editingTool.id, inputData);
      if (!res) setErrorMsg('Failed to update tool');
    } else {
      const res = await addTool(inputData);
      if (!res) setErrorMsg('Failed to add tool');
    }

    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (editingTool && confirm(`Are you sure you want to remove "${editingTool.name}" from Tool Dock?`)) {
      await deleteTool(editingTool.id);
    }
  };

  const modalContent = (
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans select-none pointer-events-auto animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="relative flex flex-col w-full max-w-md overflow-hidden rounded-2xl border border-crafted-border bg-crafted-panel shadow-2xl pointer-events-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-crafted-border/60 bg-crafted-surface/40 px-6 py-4">
            <h2 className="text-sm font-bold text-crafted-text flex items-center space-x-2.5">
              <Wrench className="h-4 w-4 text-crafted-brand-rust" />
              <span>{editingTool ? 'Edit Tool Dock Item' : 'Add New Tool to Dock'}</span>
            </h2>
            <button
              onClick={closeModal}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-crafted-text-dim hover:bg-crafted-surface-hover hover:text-crafted-text transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body / Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh] bg-crafted-bg">
            {errorMsg && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Tool Type Selector */}
            <div>
              <label className="block text-[11px] font-bold text-crafted-text-muted mb-2 uppercase tracking-wider">
                Tool Type
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setType('website');
                    if (icon === 'AppWindow') setIcon('Globe');
                  }}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3.5 rounded-xl border transition-all ${
                    type === 'website'
                      ? 'bg-crafted-surface border-crafted-brand-rust text-crafted-text font-bold shadow-sm'
                      : 'border-crafted-border text-crafted-text-muted hover:bg-crafted-surface-hover hover:text-crafted-text'
                  }`}
                >
                  <Globe className="h-4 w-4 text-crafted-brand-lightViolet" />
                  <span>Web Application</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('desktop_app');
                    if (icon === 'Globe') setIcon('AppWindow');
                  }}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3.5 rounded-xl border transition-all ${
                    type === 'desktop_app'
                      ? 'bg-crafted-surface border-crafted-brand-rust text-crafted-text font-bold shadow-sm'
                      : 'border-crafted-border text-crafted-text-muted hover:bg-crafted-surface-hover hover:text-crafted-text'
                  }`}
                >
                  <AppWindow className="h-4 w-4 text-crafted-brand-rust" />
                  <span>Desktop App</span>
                </button>
              </div>
            </div>

            {/* Detect Installed Applications Button (NVIDIA App Style) */}
            {type === 'desktop_app' && (
              <button
                type="button"
                onClick={() => setIsDetectModalOpen(true)}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 bg-crafted-surface border border-crafted-border hover:border-crafted-brand-rust text-crafted-text font-medium rounded-xl transition-all shadow-sm"
              >
                <Search className="h-3.5 w-3.5 text-crafted-brand-rust" />
                <span>Detect Installed Applications...</span>
              </button>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-[11px] font-bold text-crafted-text-muted mb-1.5 uppercase tracking-wider">
                Tool Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ChatGPT, Figma, Postman, Supabase"
                className="w-full bg-crafted-surface border border-crafted-border rounded-xl px-3.5 py-2.5 text-xs text-crafted-text focus:outline-none focus:border-crafted-brand-rust transition-colors"
              />
            </div>

            {/* Target Field */}
            <div>
              <label className="block text-[11px] font-bold text-crafted-text-muted mb-1.5 uppercase tracking-wider">
                {type === 'website' ? 'Target URL' : 'Application Executable Path, URI Scheme, or Store App'}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={
                    type === 'website'
                      ? 'https://chatgpt.com'
                      : 'C:\\...\\app.exe or figma:// or shell:AppsFolder\\...'
                  }
                  className="flex-1 bg-crafted-surface border border-crafted-border rounded-xl px-3.5 py-2.5 text-xs text-crafted-text focus:outline-none focus:border-crafted-brand-rust transition-colors font-mono"
                />
                {type === 'desktop_app' && (
                  <button
                    type="button"
                    onClick={handleSelectExecutable}
                    title="Browse Executable File"
                    className="flex items-center space-x-1.5 py-2.5 px-3.5 bg-crafted-surface border border-crafted-border hover:border-crafted-border-bright text-crafted-text rounded-xl transition-all shrink-0 font-medium"
                  >
                    <Folder className="h-3.5 w-3.5 text-crafted-brand-rust" />
                    <span>Browse</span>
                  </button>
                )}
              </div>
            </div>

            {/* Category Badge & Custom Icon URL */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-crafted-text-muted mb-1 uppercase tracking-wider">
                  Badge (Optional)
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. AI, Dev, UI"
                  className="w-full bg-crafted-surface border border-crafted-border rounded-xl px-3 py-2 text-xs text-crafted-text focus:outline-none focus:border-crafted-brand-rust"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-crafted-text-muted mb-1 uppercase tracking-wider">
                  Custom Icon URL (Optional)
                </label>
                <input
                  type="text"
                  value={customIconUrl}
                  onChange={(e) => setCustomIconUrl(e.target.value)}
                  placeholder="https://.../icon.png"
                  className="w-full bg-crafted-surface border border-crafted-border rounded-xl px-3 py-2 text-xs text-crafted-text focus:outline-none focus:border-crafted-brand-rust"
                />
              </div>
            </div>

            {/* Icon Selector Grid */}
            <div>
              <label className="block text-[11px] font-bold text-crafted-text-muted mb-2 uppercase tracking-wider">
                Select Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((opt) => {
                  const IconComp = opt.icon;
                  const isSelected = icon === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setIcon(opt.id)}
                      title={opt.name}
                      className={`flex items-center justify-center p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-crafted-surface border-crafted-brand-rust text-crafted-brand-rust ring-1 ring-crafted-brand-rust shadow-sm'
                          : 'border-crafted-border text-crafted-text-muted hover:bg-crafted-surface-hover hover:text-crafted-text'
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-crafted-border/60 flex items-center justify-between">
              {editingTool ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center space-x-1.5 py-2 px-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all font-medium"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="py-2 px-3.5 text-crafted-text-muted hover:text-crafted-text transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 py-2 px-4 bg-crafted-brand-rust hover:bg-crafted-brand-rust/90 text-white font-semibold rounded-xl shadow-crafted-button transition-all disabled:opacity-50"
                >
                  {editingTool ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>{editingTool ? 'Save Changes' : 'Add Tool'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Searchable Detect Installed Apps Dialog */}
      <DetectInstalledAppsModal
        isOpen={isDetectModalOpen}
        onClose={() => setIsDetectModalOpen(false)}
        onSelectApp={handleSelectDiscoveredApp}
        onManualBrowse={handleSelectExecutable}
      />
    </>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
