import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { ToolType } from '../shared/types/toolDock';

export interface DiscoveredApp {
  id: string;
  name: string;
  target: string;
  icon: string;
  badge?: string;
  type: ToolType;
  publisher?: string;
}

export class AppDiscoveryService {
  private static cachedApps: DiscoveredApp[] | null = null;

  public static async scanInstalledApps(): Promise<DiscoveredApp[]> {
    if (this.cachedApps && this.cachedApps.length > 0) {
      return this.cachedApps;
    }

    const apps: DiscoveredApp[] = [];
    const seenSet = new Set<string>();

    if (process.platform !== 'win32') {
      return apps;
    }

    // PowerShell Script: Scans Registry, Start Menu Shortcuts, AND Get-StartApps (covers all Microsoft Store & UWP apps)
    const psScript = `
$results = @()

# 1. Registry Scan for installed Desktop Apps
$regKeys = @(
  "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
)
foreach ($key in $regKeys) {
  Get-ItemProperty $key -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -and $_.SystemComponent -ne 1 } | ForEach-Object {
    $name = $_.DisplayName
    $rawIcon = $_.DisplayIcon
    if (-not $rawIcon) { $rawIcon = $_.UninstallString }
    if ($rawIcon) {
      $clean = $rawIcon -replace '",.*$', '' -replace '^"', '' -replace ',.*$', ''
      if ($clean -and $clean.EndsWith('.exe') -and (Test-Path $clean -PathType Leaf)) {
        $results += [PSCustomObject]@{ Name = $name; Target = $clean; Publisher = $_.Publisher; Type = "EXE" }
      }
    }
  }
}

# 2. Windows Get-StartApps (Scans all installed Store apps, UWP, MSIX, and Start Menu entries with exact AppID)
Get-StartApps -ErrorAction SilentlyContinue | ForEach-Object {
  $name = $_.Name
  $appid = $_.AppID
  if ($appid) {
    if ($appid.EndsWith('.exe') -and (Test-Path $appid -PathType Leaf)) {
      $results += [PSCustomObject]@{ Name = $name; Target = $appid; Publisher = "Desktop App"; Type = "EXE" }
    } else {
      # Microsoft Store / UWP AppUserModelID (e.g. OpenAI.ChatGPT_k55e2vqi5s58e!ChatGPT)
      $target = "shell:AppsFolder\\$appid"
      $results += [PSCustomObject]@{ Name = $name; Target = $target; Publisher = "Microsoft Store"; Type = "UWP" }
    }
  }
}

# 3. Start Menu Shortcuts Scan
$sh = New-Object -ComObject WScript.Shell
$startPaths = @(
  "$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs",
  "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs"
)
foreach ($sp in $startPaths) {
  if (Test-Path $sp) {
    Get-ChildItem -Path $sp -Filter "*.lnk" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
      try {
        $target = $sh.CreateShortcut($_.FullName).TargetPath
        if ($target -and $target.EndsWith('.exe') -and (Test-Path $target -PathType Leaf)) {
          $name = $_.BaseName
          $results += [PSCustomObject]@{ Name = $name; Target = $target; Publisher = "Start Menu"; Type = "EXE" }
        }
      } catch {}
    }
  }
}

$results | Select-Object -Unique Name, Target | ConvertTo-Json -Compress
`;

    return new Promise((resolve) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
        (err, stdout) => {
          if (!err && stdout.trim()) {
            try {
              const json = JSON.parse(stdout.trim());
              const parsedList = Array.isArray(json) ? json : [json];

              parsedList.forEach((item: any, idx: number) => {
                if (item.Name && item.Target) {
                  const normName = item.Name.trim();
                  const normTarget = item.Target.trim();
                  const lowerTarget = normTarget.toLowerCase();
                  const lowerName = normName.toLowerCase();
                  const isUWP = lowerTarget.startsWith('shell:appsfolder');

                  // Filter out uninstallers, helpers, and systemic noise
                  if (lowerName.includes('uninstall') || lowerName.includes('update') || lowerName.includes('help')) {
                    return;
                  }

                  // Physical disk existence check for EXE, or valid UWP target
                  const isValid = isUWP || fs.existsSync(normTarget);

                  if (isValid && !seenSet.has(lowerName)) {
                    seenSet.add(lowerName);

                    // Determine icon category & badge
                    let iconKey = 'AppWindow';
                    let badge = isUWP ? 'Store App' : 'Installed';

                    if (lowerTarget.includes('code.exe') || lowerTarget.includes('visual studio') || lowerTarget.includes('cursor')) {
                      iconKey = 'Code';
                      badge = 'Dev';
                    } else if (lowerTarget.includes('figma')) {
                      iconKey = 'Layers';
                      badge = 'Design';
                    } else if (lowerName.includes('chatgpt') || lowerName.includes('claude') || lowerName.includes('gemini')) {
                      iconKey = 'Bot';
                      badge = 'AI';
                    } else if (lowerTarget.includes('terminal') || lowerTarget.includes('cmd.exe') || lowerTarget.includes('powershell')) {
                      iconKey = 'Terminal';
                      badge = 'System';
                    }

                    apps.push({
                      id: `app-real-${idx}-${crypto.randomUUID().slice(0, 4)}`,
                      name: normName,
                      target: normTarget,
                      icon: iconKey,
                      badge,
                      type: 'desktop_app',
                      publisher: item.Publisher || 'Desktop App',
                    });
                  }
                }
              });
            } catch {
              /* Ignore parse error */
            }
          }

          // ALPHABETICAL SORTING (A-Z)
          apps.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

          console.log(`[AppDiscoveryService] Real Scan Completed: Discovered ${apps.length} physically verified installed applications (Including Store Apps).`);
          this.cachedApps = apps;
          resolve(apps);
        }
      );
    });
  }
}
