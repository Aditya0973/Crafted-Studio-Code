import { execFile } from 'child_process';
import { BrowserWindow, screen } from 'electron';

export interface WorkspaceBounds {
  craftedStudio: { x: number; y: number; width: number; height: number };
  externalApp: { x: number; y: number; width: number; height: number };
}

export class Win32WindowService {
  private static activeHwnd: string | null = null;
  private static activeKeywords: string[] = [];

  // Extract clean search keywords from target path and tool display name
  public static getKeywordsFromTarget(target: string, toolName?: string): string[] {
    const keywords: Set<string> = new Set();

    if (toolName) {
      const cleanName = toolName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
      cleanName.split(/\s+/).forEach((w) => {
        if (w.length > 2 && w !== 'app' && w !== 'store' && w !== 'desktop') {
          keywords.add(w);
        }
      });
    }

    if (target) {
      const cleanTarget = target.toLowerCase().replace(/\\/g, '/');

      // URI Scheme (e.g. figma://, vscode://, chatgpt://, stremio://)
      if (cleanTarget.includes('://')) {
        const scheme = cleanTarget.split('://')[0];
        if (scheme) keywords.add(scheme);
      }

      // Shell AppsFolder (e.g. shell:AppsFolder\OpenAI.ChatGPT-Package_k55e2vqi5s58e!App)
      if (cleanTarget.includes('shell:appsfolder')) {
        if (cleanTarget.includes('notepad')) keywords.add('notepad');
        if (cleanTarget.includes('explorer')) keywords.add('explorer');
        if (cleanTarget.includes('chatgpt') || cleanTarget.includes('openai')) {
          keywords.add('chatgpt');
          keywords.add('openai');
        }
        if (cleanTarget.includes('terminal')) keywords.add('terminal');
        if (cleanTarget.includes('figma')) keywords.add('figma');
        if (cleanTarget.includes('code')) keywords.add('code');
        if (cleanTarget.includes('stremio')) keywords.add('stremio');
        if (cleanTarget.includes('audacity')) keywords.add('audacity');
        if (cleanTarget.includes('cursor')) keywords.add('cursor');
      }

      // Executable path (e.g. C:/Program Files/Stremio/stremio.exe or Audacity/audacity.exe)
      const filename = cleanTarget.split('/').pop() || '';
      const baseExe = filename.replace(/\.exe$/i, '');
      if (baseExe && baseExe.length > 2 && baseExe !== 'app' && baseExe !== 'applicationframehost') {
        keywords.add(baseExe);
      }
    }

    const result = Array.from(keywords);
    console.log(`[Win32WindowService] Extracted search keywords for target="${target}", toolName="${toolName}":`, result);
    return result;
  }

  // Fast Native Win32 Window Handle Search using PowerShell C# compilation
  public static async findMainWindowHwnd(keywords: string[], csHwndVal: number): Promise<string | null> {
    if (process.platform !== 'win32' || !keywords || keywords.length === 0) return null;

    const kwJson = JSON.stringify(keywords);

    const psScript = `
$keywords = '${kwJson}' | ConvertFrom-Json
$csHwnd = ${csHwndVal}

$code = @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class WinTracker {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

  public static long FindMatchingHwnd(string[] kwList, long csHwndVal) {
    long found = 0;
    EnumWindows(delegate(IntPtr hwnd, IntPtr lParam) {
      if (hwnd.ToInt64() == csHwndVal) return true;
      if (!IsWindowVisible(hwnd)) return true;

      RECT rect;
      GetWindowRect(hwnd, out rect);
      int w = rect.Right - rect.Left;
      int h = rect.Bottom - rect.Top;
      if (w < 150 || h < 150) return true;

      StringBuilder sbClass = new StringBuilder(256);
      GetClassName(hwnd, sbClass, 256);
      string clsName = sbClass.ToString();

      if (clsName == "Progman" || clsName == "WorkerW" || clsName == "Shell_TrayWnd" || clsName == "ImmersiveLauncher") {
        return true;
      }

      StringBuilder sbTitle = new StringBuilder(256);
      GetWindowText(hwnd, sbTitle, 256);
      string title = sbTitle.ToString().ToLower();

      uint pidVal = 0;
      GetWindowThreadProcessId(hwnd, out pidVal);
      string procName = "";
      try {
        var proc = System.Diagnostics.Process.GetProcessById((int)pidVal);
        if (proc != null) procName = proc.ProcessName.ToLower();
      } catch {}

      foreach (string kw in kwList) {
        // Special Rule: File Explorer
        if (kw == "explorer" || kw == "file") {
          if (clsName == "CabinetWClass" || clsName == "ExplorerWClass") {
            found = hwnd.ToInt64();
            return false;
          }
        }
        // Special Rule: Notepad
        if (kw == "notepad") {
          if (procName.Contains("notepad") || clsName == "Notepad" || clsName == "NotepadX" || title.Contains("notepad")) {
            found = hwnd.ToInt64();
            return false;
          }
        }
        // Special Rule: ChatGPT Desktop / OpenAI (Store app or desktop app)
        if (kw == "chatgpt" || kw == "openai") {
          if (procName.Contains("chatgpt") || procName.Contains("openai") || clsName == "ApplicationFrameWindow" || title.Contains("chatgpt")) {
            found = hwnd.ToInt64();
            return false;
          }
        }

        // General Keyword Rule: Process Name or Window Title
        if ((procName.Length > 0 && procName.Contains(kw)) || (title.Length > 0 && title.Contains(kw))) {
          found = hwnd.ToInt64();
          return false;
        }
      }

      return true;
    }, IntPtr.Zero);

    return found;
  }
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$res = [WinTracker]::FindMatchingHwnd($keywords, $csHwnd)
if ($res -gt 0) { Write-Output "$res" } else { exit 1 }
`;

    return new Promise((resolve) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
        (err, stdout) => {
          if (err || !stdout.trim()) {
            resolve(null);
          } else {
            const hwnd = stdout.trim();
            console.log(`[Win32WindowService] HWND FOUND for keywords [${keywords.join(', ')}]: ${hwnd}`);
            resolve(hwnd);
          }
        }
      );
    });
  }

  // Poll for window handle after launch (Extended 30-Second Polling for Heavy Apps like ChatGPT/Figma/VS Code)
  public static async pollAndSnapWindow(
    target: string,
    toolName: string | undefined,
    mainWindow: BrowserWindow
  ): Promise<boolean> {
    if (process.platform !== 'win32' || !mainWindow) return false;

    const keywords = this.getKeywordsFromTarget(target, toolName);
    if (keywords.length === 0) return false;

    this.activeKeywords = keywords;

    // Get Native HWND handle of Crafted Studio to avoid self-snapping
    const csHwndBuf = mainWindow.getNativeWindowHandle();
    const csHwndVal = csHwndBuf.readInt32LE(0);

    console.log(`[Win32WindowService] Starting extended 30s polling pass for target="${target}" (keywords: [${keywords.join(', ')}])`);
    let attempts = 0;

    const attemptSnap = async (): Promise<boolean> => {
      attempts++;
      const hwnd = await this.findMainWindowHwnd(keywords, csHwndVal);
      if (hwnd) {
        this.activeHwnd = hwnd;
        console.log(`[Win32WindowService] Main window HWND ${hwnd} confirmed. Executing side-by-side workspace arrangement...`);
        return await this.arrangeWorkspace(hwnd, mainWindow);
      }

      if (attempts < 50) {
        const delay = attempts <= 10 ? 300 : attempts <= 30 ? 500 : 800;
        setTimeout(attemptSnap, delay);
      } else {
        console.warn(`[Win32WindowService] Polling timeout (29s) reached for keywords [${keywords.join(', ')}]. User can click "Arrange Workspace Again" to snap manually.`);
      }
      return false;
    };

    return attemptSnap();
  }

  // Dynamic Workspace Arrangement with Win32 ShowWindow(SW_RESTORE) and Minimum Tracking Width Compensation
  public static async arrangeWorkspace(
    hwnd: string,
    mainWindow: BrowserWindow
  ): Promise<boolean> {
    if (!mainWindow || !hwnd || process.platform !== 'win32') return false;

    // 1. Unmaximize Crafted Studio if maximized
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }

    const currentBounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(currentBounds);
    const workArea = display.workArea;

    // Target 60/40 Split Calculation
    const targetCsWidth = Math.floor(workArea.width * 0.60);
    const targetExtWidth = workArea.width - targetCsWidth;
    const targetExtX = workArea.x + targetCsWidth;

    console.log('[Win32WindowService] Initial Target 60/40 Bounds:', {
      workArea,
      targetCsWidth,
      targetExtWidth,
      targetExtX,
      hwnd,
    });

    // C# Script: Unmaximizes window if maximized (ShowWindow SW_RESTORE = 9) then applies SetWindowPos and measures resulting bounds
    const psScript = `
$hwndVal = [IntPtr]${hwnd}
$targetX = ${targetExtX}
$targetY = ${workArea.y}
$targetW = ${targetExtWidth}
$targetH = ${workArea.height}
$screenRight = ${workArea.x + workArea.width}

$code = @"
using System;
using System.Runtime.InteropServices;
public class WinSnap {
  [DllImport("user32.dll", SetLastError = true)] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

  public static string SnapAndMeasure(IntPtr hwnd, int x, int y, int w, int h, int maxRight) {
    // If external window is currently maximized, unmaximize/restore it first (SW_RESTORE = 9)
    if (IsZoomed(hwnd)) {
      ShowWindow(hwnd, 9);
    }

    // 0x0074 = SWP_NOZORDER | SWP_NOACTIVATE | SWP_SHOWWINDOW | SWP_FRAMECHANGED
    SetWindowPos(hwnd, IntPtr.Zero, x, y, w, h, 0x0074);

    RECT r;
    GetWindowRect(hwnd, out r);
    int actualW = r.Right - r.Left;
    int actualH = r.Bottom - r.Top;

    // If app enforced minimum width exceeding targetW, shift X left so right edge stays 100% on-screen!
    int finalX = x;
    if (x + actualW > maxRight) {
      finalX = maxRight - actualW;
      if (finalX < 0) finalX = 0;
      SetWindowPos(hwnd, IntPtr.Zero, finalX, y, actualW, h, 0x0074);
    }

    return finalX + ":" + actualW + ":" + actualH;
  }
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$res = [WinSnap]::SnapAndMeasure($hwndVal, $targetX, $targetY, $targetW, $targetH, $screenRight)
Write-Output "$res"
`;

    return new Promise((resolve) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
        (err, stdout) => {
          if (err || !stdout.trim()) {
            console.error(`[Win32WindowService] SetWindowPos FAILED for HWND ${hwnd}:`, stdout || err);
            resolve(false);
          } else {
            const parts = stdout.trim().split(':');
            const finalExtX = parseInt(parts[0], 10);
            const actualExtWidth = parseInt(parts[1], 10);

            // Dynamically adjust Crafted Studio width so both windows sit 100% inside workArea with 0px overlap and 0px off-screen overflow
            const finalCsWidth = Math.max(400, finalExtX - workArea.x);

            const csBounds = {
              x: workArea.x,
              y: workArea.y,
              width: finalCsWidth,
              height: workArea.height,
            };

            mainWindow.setBounds(csBounds);

            console.log(`[Win32WindowService] Workspace Arrangement SUCCESS! CS width: ${finalCsWidth}px, External App (HWND ${hwnd}) width: ${actualExtWidth}px, X: ${finalExtX}px. 100% inside screen workArea!`);
            resolve(true);
          }
        }
      );
    });
  }

  // Manual Trigger: User clicks "Arrange Workspace Again" (with fallback window search if activeHwnd was not found initially)
  public static async snapActiveToolAgain(mainWindow: BrowserWindow): Promise<boolean> {
    if (!mainWindow) return false;

    if (this.activeHwnd) {
      return await this.arrangeWorkspace(this.activeHwnd, mainWindow);
    }

    // Fallback: Re-run HWND search using activeKeywords if initial polling timed out
    if (this.activeKeywords.length > 0) {
      const csHwndBuf = mainWindow.getNativeWindowHandle();
      const csHwndVal = csHwndBuf.readInt32LE(0);
      const hwnd = await this.findMainWindowHwnd(this.activeKeywords, csHwndVal);
      if (hwnd) {
        this.activeHwnd = hwnd;
        return await this.arrangeWorkspace(hwnd, mainWindow);
      }
    }

    return false;
  }
}
