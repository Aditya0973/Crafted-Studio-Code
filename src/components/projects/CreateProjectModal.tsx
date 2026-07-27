import React, { useState, useEffect } from 'react';
import {
  X,
  FolderOpen,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FileCode,
  Smartphone,
  Atom,
  Layers,
  Laptop,
  Server,
  Box,
  Compass,
  Sliders,
  ArrowDown,
  Layers3,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { BlueprintRegistry } from '../../blueprints/BlueprintRegistry';
import { ModuleRegistry } from '../../modules/ModuleRegistry';
import { ProjectBlueprint } from '../../blueprints/types';
import { ModuleCategory } from '../../modules/types';

export const CreateProjectModal: React.FC = () => {
  const { isCreateDialogOpen, setCreateDialogOpen, createProject } = useProjectStore();

  // Mode state: 'beginner' vs 'advanced'
  const [mode, setMode] = useState<'beginner' | 'advanced'>('beginner');

  // Common Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Beginner Questionnaire Answers
  const [beginnerStep, setBeginnerStep] = useState<1 | 2 | 3>(1);
  const [targetType, setTargetType] = useState<'mobile' | 'desktop' | 'web' | 'backend' | 'general'>('mobile');
  const [needAccounts, setNeedAccounts] = useState<'yes' | 'no' | 'maybe'>('maybe');
  const [dataStorage, setDataStorage] = useState<'cloud' | 'local' | 'both' | 'no'>('both');
  const [monetization, setMonetization] = useState<'subs' | 'ads' | 'both' | 'free'>('ads');

  // Advanced Wizard State
  const [advancedStep, setAdvancedStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>('flutter');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(['riverpod', 'isar']);

  // Recommendation Engine Output Layered Stack
  const computeRecommendationStack = () => {
    let bpId = 'blank';
    const modIds = new Set<string>();
    const stack: { layer: string; name: string; reason: string }[] = [];

    if (targetType === 'mobile') {
      bpId = 'flutter';
      stack.push({
        layer: 'Frontend UI Engine',
        name: 'Flutter App (Dart & Material 3)',
        reason: 'Selected for cross-platform iOS and Android apps with beautiful native UI.',
      });
      modIds.add('riverpod');
      stack.push({
        layer: 'State Management Layer',
        name: 'Riverpod State Engine',
        reason: 'Provides reactive state handling across your app components.',
      });
    } else if (targetType === 'web') {
      if (needAccounts === 'yes' || dataStorage === 'cloud') {
        bpId = 'nextjs';
        stack.push({
          layer: 'Full-Stack Web Engine',
          name: 'Next.js App Router',
          reason: 'Chosen for cloud database access, server rendering, and API endpoints.',
        });
      } else {
        bpId = 'react';
        stack.push({
          layer: 'Web Application Layer',
          name: 'React SPA (TypeScript)',
          reason: 'Chosen for interactive browser apps.',
        });
      }
    } else if (targetType === 'desktop') {
      bpId = 'electron';
      stack.push({
        layer: 'Desktop Engine',
        name: 'Electron Desktop Shell',
        reason: 'Chosen for cross-platform Windows, macOS, and Linux desktop apps.',
      });
    } else if (targetType === 'backend') {
      bpId = 'node-api';
      stack.push({
        layer: 'Backend API Service',
        name: 'Node.js API Server',
        reason: 'Chosen for fast REST endpoints and database connections.',
      });
    } else {
      bpId = 'blank';
      stack.push({
        layer: 'General Workspace',
        name: 'General Software Blueprint',
        reason: 'Clean, flexible baseline for custom software development.',
      });
    }

    // Data Storage Layer
    if (dataStorage === 'local' || dataStorage === 'both') {
      if (bpId === 'flutter') {
        modIds.add('isar');
        stack.push({
          layer: 'Local Database Layer',
          name: 'Isar DB (Offline Local Storage)',
          reason: 'Chosen because you selected offline device storage.',
        });
      } else {
        modIds.add('drift');
        stack.push({
          layer: 'Local Database Layer',
          name: 'Drift SQLite Engine',
          reason: 'Chosen for persistent local storage on device.',
        });
      }
    }

    if (dataStorage === 'cloud' || dataStorage === 'both' || needAccounts === 'yes') {
      modIds.add('supabase');
      stack.push({
        layer: 'Backend & Cloud Layer',
        name: 'Supabase Cloud Sync & Auth',
        reason: 'Chosen because you selected cloud sync or user accounts.',
      });
    }

    // Monetization Layer
    if (monetization === 'ads' || monetization === 'both') {
      modIds.add('admob');
      stack.push({
        layer: 'Monetization Layer',
        name: 'Google AdMob',
        reason: 'Chosen to serve banner and interstitial ads.',
      });
    }
    if (monetization === 'subs' || monetization === 'both') {
      modIds.add('revenuecat');
      stack.push({
        layer: 'In-App Purchases Layer',
        name: 'RevenueCat Subscriptions',
        reason: 'Chosen to handle App Store and Google Play subscriptions.',
      });
    }

    return {
      blueprintId: bpId,
      moduleIds: Array.from(modIds),
      stack,
    };
  };

  const recommendation = computeRecommendationStack();

  // Sync recommendation into selection if in Beginner Mode
  useEffect(() => {
    if (mode === 'beginner') {
      setSelectedBlueprintId(recommendation.blueprintId);
      setSelectedModuleIds(recommendation.moduleIds);
    }
  }, [mode, targetType, needAccounts, dataStorage, monetization]);

  if (!isCreateDialogOpen) return null;

  const blueprints = BlueprintRegistry.getAllBlueprints();
  const allModules = ModuleRegistry.getAllModules();
  const selectedBlueprint = BlueprintRegistry.getBlueprint(selectedBlueprintId);

  const categories: { key: ModuleCategory; label: string }[] = [
    { key: 'state-management', label: 'State Management' },
    { key: 'database', label: 'Database & Persistence' },
    { key: 'backend-services', label: 'Backend Services' },
    { key: 'monetization', label: 'Monetization & Ads' },
    { key: 'analytics', label: 'Telemetry & Analytics' },
  ];

  const handleSelectFolder = async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      const chosen = await window.craftedAPI.selectFolder();
      if (chosen) {
        setParentPath(chosen);
        setError(null);
      }
    }
  };

  const handleToggleModule = (moduleId: string) => {
    if (selectedModuleIds.includes(moduleId)) {
      setSelectedModuleIds(selectedModuleIds.filter((id) => id !== moduleId));
    } else {
      setSelectedModuleIds([...selectedModuleIds, moduleId]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    if (!parentPath.trim()) {
      setError('Project location folder is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const proj = await createProject({
        name: name.trim(),
        parentPath: parentPath.trim(),
        description: description.trim(),
        blueprintId: selectedBlueprintId,
        selectedModules: selectedModuleIds,
      });

      if (proj) {
        setBeginnerStep(1);
        setAdvancedStep(1);
        setName('');
        setDescription('');
        setParentPath('');
        setCreateDialogOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBlueprintIcon = (iconKey: string) => {
    switch (iconKey) {
      case 'smartphone':
        return <Smartphone className="h-5 w-5 text-cyan-400" />;
      case 'atom':
        return <Atom className="h-5 w-5 text-indigo-400" />;
      case 'layers':
        return <Layers className="h-5 w-5 text-emerald-400" />;
      case 'laptop':
        return <Laptop className="h-5 w-5 text-amber-400" />;
      case 'server':
        return <Server className="h-5 w-5 text-rose-400" />;
      default:
        return <FileCode className="h-5 w-5 text-crafted-brand-rust" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none font-sans p-4 animate-fade-in">
      <div className="flex flex-col w-full max-w-2xl max-h-[88vh] rounded-2xl border border-crafted-border bg-crafted-bg shadow-crafted-card overflow-hidden">
        {/* Header Bar */}
        <div className="flex h-14 items-center justify-between border-b border-crafted-border px-6 bg-crafted-surface/40">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#433FA9] to-[#A9452D] text-white shadow-crafted-glow">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-crafted-text">New Project Wizard</h2>
              <p className="text-[10px] font-mono text-crafted-text-dim">
                {mode === 'beginner' ? `Guided Product Interview (Step ${beginnerStep} of 3)` : `Advanced Technical Setup (Step ${advancedStep} of 4)`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setMode(mode === 'beginner' ? 'advanced' : 'beginner');
                setError(null);
              }}
              className="flex items-center space-x-1.5 rounded-lg border border-crafted-border bg-crafted-surface px-2.5 py-1 text-xs text-crafted-text-muted hover:text-crafted-text hover:bg-crafted-surface-hover transition-colors"
            >
              {mode === 'beginner' ? (
                <>
                  <Sliders className="h-3.5 w-3.5 text-amber-400" />
                  <span>Switch to Advanced Mode</span>
                </>
              ) : (
                <>
                  <Compass className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Switch to Beginner Mode</span>
                </>
              )}
            </button>

            <button
              onClick={() => setCreateDialogOpen(false)}
              className="rounded-lg p-1.5 text-crafted-text-muted hover:bg-crafted-surface hover:text-crafted-text transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* BEGINNER MODE CONTENT */}
        {mode === 'beginner' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Step 1: Project Name & Application Goal */}
            {beginnerStep === 1 && (
              <div className="space-y-4 animate-fade-in font-sans">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-crafted-text">What do you want to build?</h3>
                  <p className="text-xs text-crafted-text-muted">
                    Tell us what kind of software you are creating.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-mono text-crafted-text-dim uppercase tracking-wider">Project Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. My Next Big Idea"
                      className="w-full rounded-xl border border-crafted-border bg-crafted-surface px-3.5 py-2.5 text-xs text-crafted-text placeholder:text-crafted-text-dim focus:border-crafted-brand-rust focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-mono text-crafted-text-dim uppercase tracking-wider">Location Folder *</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={parentPath}
                        placeholder="Select location folder..."
                        className="flex-1 rounded-xl border border-crafted-border bg-crafted-surface/70 px-3.5 py-2 text-xs text-crafted-text placeholder:text-crafted-text-dim focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSelectFolder}
                        className="flex items-center space-x-1.5 rounded-xl border border-crafted-border bg-crafted-surface px-3 py-2 text-xs font-medium text-crafted-text hover:bg-crafted-surface-hover transition-colors"
                      >
                        <FolderOpen className="h-4 w-4 text-crafted-brand-rust" />
                        <span>Browse</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="block text-xs font-mono text-crafted-text-dim uppercase tracking-wider">Application Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {[
                        { id: 'mobile', label: 'Mobile App', icon: Smartphone, desc: 'iPhone & Android' },
                        { id: 'web', label: 'Website / Web App', icon: Atom, desc: 'Web Browser Application' },
                        { id: 'desktop', label: 'Desktop App', icon: Laptop, desc: 'Windows & Mac App' },
                        { id: 'backend', label: 'Backend / API', icon: Server, desc: 'Cloud Service & Database' },
                        { id: 'general', label: 'Other Software', icon: FileCode, desc: 'General Workspace' },
                      ].map((t) => {
                        const IconComponent = t.icon;
                        const isSelected = targetType === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setTargetType(t.id as any)}
                            className={`flex flex-col justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-crafted-brand-rust bg-crafted-surface shadow-crafted-glow ring-1 ring-crafted-brand-rust/40'
                                : 'border-crafted-border bg-crafted-surface/40 hover:border-crafted-border-bright'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <IconComponent className={`h-4 w-4 ${isSelected ? 'text-crafted-brand-rust' : 'text-crafted-text-dim'}`} />
                              {isSelected && <Check className="h-3.5 w-3.5 text-crafted-brand-rust" />}
                            </div>
                            <div className="mt-2 space-y-0.5">
                              <h4 className="text-xs font-bold text-crafted-text">{t.label}</h4>
                              <p className="text-[10px] text-crafted-text-muted">{t.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Non-Technical Conversational Interview (Part 4) */}
            {beginnerStep === 2 && (
              <div className="space-y-4 animate-fade-in font-sans">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-crafted-text">App Requirements</h3>
                  <p className="text-xs text-crafted-text-muted">
                    Answer these simple questions to help us tailor your tech stack.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Where should data live? */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-crafted-text-dim uppercase tracking-wider">Where should your users' data live?</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { id: 'local', label: 'Only on their device' },
                        { id: 'cloud', label: 'Sync across devices' },
                        { id: 'both', label: 'Both on device & cloud' },
                        { id: 'no', label: 'No data storage' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setDataStorage(opt.id as any)}
                          className={`rounded-xl border p-2.5 text-xs text-center font-medium transition-all ${
                            dataStorage === opt.id
                              ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300 font-bold'
                              : 'border-crafted-border bg-crafted-surface/40 text-crafted-text-muted hover:border-crafted-border-bright'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Will users sign in? */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-crafted-text-dim uppercase tracking-wider">Will users sign in?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'yes', label: 'Yes, accounts required' },
                        { id: 'maybe', label: 'Maybe later' },
                        { id: 'no', label: 'No accounts needed' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setNeedAccounts(opt.id as any)}
                          className={`rounded-xl border p-2.5 text-xs text-center font-medium transition-all ${
                            needAccounts === opt.id
                              ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300 font-bold'
                              : 'border-crafted-border bg-crafted-surface/40 text-crafted-text-muted hover:border-crafted-border-bright'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* How will app make money? */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-crafted-text-dim uppercase tracking-wider">How will your application make money?</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { id: 'ads', label: 'Show ads' },
                        { id: 'subs', label: 'Subscriptions & Purchases' },
                        { id: 'both', label: 'Both Ads & Purchases' },
                        { id: 'free', label: 'Free app' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setMonetization(opt.id as any)}
                          className={`rounded-xl border p-2.5 text-xs text-center font-medium transition-all ${
                            monetization === opt.id
                              ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300 font-bold'
                              : 'border-crafted-border bg-crafted-surface/40 text-crafted-text-muted hover:border-crafted-border-bright'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Layered Stack Recommendation Screen (Part 3) */}
            {beginnerStep === 3 && (
              <div className="space-y-4 animate-fade-in font-sans">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-crafted-text">Recommended Stack for {name || 'Your Project'}</h3>
                    <p className="text-xs text-crafted-text-muted mt-0.5">
                      Organized into a clear layered architecture with reasons for every selection.
                    </p>
                  </div>
                  <span className="flex items-center space-x-1 font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <Layers3 className="h-3.5 w-3.5" />
                    <span>Layered Stack</span>
                  </span>
                </div>

                {/* Layered Stack Rendering */}
                <div className="space-y-3">
                  {recommendation.stack.map((layerItem, idx) => (
                    <React.Fragment key={idx}>
                      <div className="flex flex-col rounded-xl border border-crafted-border bg-crafted-surface/50 p-3.5 space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase font-bold text-crafted-brand-rust tracking-wider">
                            {layerItem.layer}
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <h4 className="text-xs font-bold text-crafted-text">{layerItem.name}</h4>
                        <p className="text-[11px] text-crafted-text-muted leading-relaxed">
                          <strong className="text-crafted-text-dim">Why chosen:</strong> {layerItem.reason}
                        </p>
                      </div>

                      {idx < recommendation.stack.length - 1 && (
                        <div className="flex justify-center -my-1">
                          <ArrowDown className="h-3.5 w-3.5 text-crafted-text-dim animate-bounce" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ADVANCED MODE CONTENT (Sprint 9 Direct Selection Flow) */
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Step 1: Info */}
            {advancedStep === 1 && (
              <div className="space-y-4 animate-fade-in font-sans">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-crafted-text">Project Information</h3>
                  <p className="text-xs text-crafted-text-muted">Name your project and choose target directory.</p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-mono text-crafted-text-dim uppercase tracking-wider">Project Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. My Custom Engine"
                      className="w-full rounded-xl border border-crafted-border bg-crafted-surface px-3.5 py-2 text-xs text-crafted-text placeholder:text-crafted-text-dim focus:border-crafted-brand-rust focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-mono text-crafted-text-dim uppercase tracking-wider">Location Folder *</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={parentPath}
                        placeholder="Select location folder..."
                        className="flex-1 rounded-xl border border-crafted-border bg-crafted-surface/70 px-3.5 py-2 text-xs text-crafted-text placeholder:text-crafted-text-dim focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSelectFolder}
                        className="flex items-center space-x-1.5 rounded-xl border border-crafted-border bg-crafted-surface px-3 py-2 text-xs font-medium text-crafted-text hover:bg-crafted-surface-hover transition-colors"
                      >
                        <FolderOpen className="h-4 w-4 text-crafted-brand-rust" />
                        <span>Browse</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Blueprint Selection */}
            {advancedStep === 2 && (
              <div className="space-y-4 animate-fade-in font-sans">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-crafted-text">Select Project Blueprint</h3>
                  <p className="text-xs text-crafted-text-muted">Choose architectural blueprint.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {blueprints.map((bp: ProjectBlueprint) => {
                    const isSelected = bp.id === selectedBlueprintId;
                    return (
                      <div
                        key={bp.id}
                        onClick={() => setSelectedBlueprintId(bp.id)}
                        className={`flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-crafted-brand-rust bg-crafted-surface shadow-crafted-glow ring-1 ring-crafted-brand-rust/50'
                            : 'border-crafted-border bg-crafted-surface/40 hover:border-crafted-border-bright'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            {renderBlueprintIcon(bp.icon)}
                            <h4 className="text-xs font-bold text-crafted-text">{bp.displayName}</h4>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-crafted-brand-rust" />}
                        </div>
                        <p className="text-[11px] text-crafted-text-muted mt-2">{bp.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Modules Selection */}
            {advancedStep === 3 && (
              <div className="space-y-4 animate-fade-in font-sans">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-crafted-text">Optional Modules</h3>
                  <p className="text-xs text-crafted-text-muted">Select optional architecture modules.</p>
                </div>
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const catMods = allModules.filter((m) => m.category === cat.key);
                    return (
                      <div key={cat.key} className="space-y-1.5">
                        <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-crafted-brand-rust">{cat.label}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {catMods.map((mod) => {
                            const isChecked = selectedModuleIds.includes(mod.id);
                            return (
                              <div
                                key={mod.id}
                                onClick={() => handleToggleModule(mod.id)}
                                className={`flex items-center space-x-2 rounded-xl border p-2.5 cursor-pointer text-xs ${
                                  isChecked ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-crafted-border bg-crafted-surface/40 text-crafted-text-muted'
                                }`}
                              >
                                <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${isChecked ? 'bg-cyan-400 border-cyan-400 text-black' : 'border-crafted-border'}`}>
                                  {isChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                </div>
                                <span className="font-bold truncate">{mod.displayName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {advancedStep === 4 && (
              <div className="space-y-4 animate-fade-in font-sans">
                <h3 className="text-sm font-bold text-crafted-text">Review Configuration</h3>
                <div className="rounded-xl border border-crafted-border bg-crafted-surface/40 p-4 space-y-2 text-xs">
                  <div><strong>Name:</strong> {name}</div>
                  <div><strong>Blueprint:</strong> {selectedBlueprint.displayName}</div>
                  <div><strong>Modules:</strong> {selectedModuleIds.join(', ') || 'None'}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex h-16 items-center justify-between border-t border-crafted-border px-6 bg-crafted-surface/40">
          {mode === 'beginner' ? (
            <>
              {beginnerStep > 1 ? (
                <button
                  onClick={() => setBeginnerStep((beginnerStep - 1) as 1 | 2 | 3)}
                  className="flex items-center space-x-1 rounded-xl border border-crafted-border bg-crafted-surface px-3.5 py-2 text-xs font-medium text-crafted-text hover:bg-crafted-surface-hover transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              {beginnerStep < 3 ? (
                <button
                  onClick={() => {
                    if (!name.trim()) { setError('Project name is required'); return; }
                    if (!parentPath.trim()) { setError('Project location folder is required'); return; }
                    setError(null);
                    setBeginnerStep((beginnerStep + 1) as 1 | 2 | 3);
                  }}
                  className="flex items-center space-x-1 rounded-xl bg-gradient-to-r from-[#433FA9] to-[#A9452D] px-4 py-2 text-xs font-semibold text-white shadow-crafted-glow hover:opacity-90 transition-opacity"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-[#433FA9] to-[#A9452D] px-5 py-2 text-xs font-bold text-white shadow-crafted-glow hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isSubmitting ? 'Initializing Project...' : 'Accept Stack & Create Project'}</span>
                </button>
              )}
            </>
          ) : (
            <>
              {advancedStep > 1 ? (
                <button
                  onClick={() => setAdvancedStep((advancedStep - 1) as 1 | 2 | 3 | 4)}
                  className="flex items-center space-x-1 rounded-xl border border-crafted-border bg-crafted-surface px-3.5 py-2 text-xs font-medium text-crafted-text hover:bg-crafted-surface-hover transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              {advancedStep < 4 ? (
                <button
                  onClick={() => {
                    if (advancedStep === 1) {
                      if (!name.trim()) { setError('Project name is required'); return; }
                      if (!parentPath.trim()) { setError('Project location folder is required'); return; }
                    }
                    setError(null);
                    setAdvancedStep((advancedStep + 1) as 1 | 2 | 3 | 4);
                  }}
                  className="flex items-center space-x-1 rounded-xl bg-gradient-to-r from-[#433FA9] to-[#A9452D] px-4 py-2 text-xs font-semibold text-white shadow-crafted-glow hover:opacity-90 transition-opacity"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-[#433FA9] to-[#A9452D] px-5 py-2 text-xs font-bold text-white shadow-crafted-glow hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isSubmitting ? 'Initializing Project...' : 'Create Project'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
