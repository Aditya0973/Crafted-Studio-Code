import hotkeys from 'hotkeys-js';

export interface ShortcutBinding {
  id: string;
  combo: string; // e.g. "ctrl+1", "ctrl+`", "command+1"
  description: string;
  category?: 'workspace' | 'editor' | 'navigation';
  handler: (e: KeyboardEvent) => void;
}

export class ShortcutManager {
  private static instance: ShortcutManager | null = null;
  private bindings: Map<string, ShortcutBinding> = new Map();

  private constructor() {
    // Custom hotkey filter: allow shortcuts inside input/textarea if ctrl, meta, or alt modifier is present
    hotkeys.filter = (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return true;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.classList.contains('xterm-helper-textarea');

      return !isInput || event.ctrlKey || event.metaKey || event.altKey;
    };
  }

  public static getInstance(): ShortcutManager {
    if (!ShortcutManager.instance) {
      ShortcutManager.instance = new ShortcutManager();
    }
    return ShortcutManager.instance;
  }

  /**
   * Register a shortcut combo binding using hotkeys-js engine
   */
  public register(binding: ShortcutBinding): void {
    if (this.bindings.has(binding.id)) {
      this.unregister(binding.id);
    }

    const normalizedCombo = binding.combo.toLowerCase().trim();
    const updatedBinding = { ...binding, combo: normalizedCombo };

    this.bindings.set(binding.id, updatedBinding);

    hotkeys(normalizedCombo, (event) => {
      event.preventDefault();
      event.stopPropagation();
      updatedBinding.handler(event);
    });
  }

  /**
   * Unregister an existing shortcut binding
   */
  public unregister(id: string): void {
    const binding = this.bindings.get(id);
    if (binding) {
      hotkeys.unbind(binding.combo);
      this.bindings.delete(id);
    }
  }

  /**
   * Rebind an existing shortcut to a new combination (with conflict check)
   */
  public rebind(id: string, newCombo: string): { success: boolean; conflict?: ShortcutBinding } {
    const binding = this.bindings.get(id);
    if (!binding) return { success: false };

    const conflict = this.getConflict(newCombo, id);
    if (conflict) {
      return { success: false, conflict };
    }

    this.unregister(id);
    this.register({
      ...binding,
      combo: newCombo,
    });
    return { success: true };
  }

  /**
   * Conflict Detection Engine: check if a combo combination is already bound to another shortcut
   */
  public getConflict(combo: string, excludeId?: string): ShortcutBinding | null {
    const norm = combo.toLowerCase().replace(/\s+/g, '');
    for (const binding of this.bindings.values()) {
      if (binding.id === excludeId) continue;
      if (binding.combo.toLowerCase().replace(/\s+/g, '') === norm) {
        return binding;
      }
    }
    return null;
  }

  public getAllBindings(): ShortcutBinding[] {
    return Array.from(this.bindings.values());
  }

  public getBinding(id: string): ShortcutBinding | undefined {
    return this.bindings.get(id);
  }

  public serialize(): Record<string, string> {
    const result: Record<string, string> = {};
    this.bindings.forEach((binding, id) => {
      result[id] = binding.combo;
    });
    return result;
  }
}

export const shortcutManager = ShortcutManager.getInstance();
