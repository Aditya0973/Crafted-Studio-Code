import React from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Code2,
  Image as ImageIcon,
  File,
  FileCode,
} from 'lucide-react';

interface FileIconOptions {
  isDirectory?: boolean;
  isExpanded?: boolean;
  className?: string;
}

export function getFileIcon(filenameOrPath: string, options: FileIconOptions = {}): React.ReactElement {
  const { isDirectory = false, isExpanded = false, className = 'h-3.5 w-3.5 shrink-0' } = options;

  if (isDirectory) {
    return isExpanded ? (
      <FolderOpen className={`${className} text-crafted-brand-lightViolet`} />
    ) : (
      <Folder className={`${className} text-crafted-brand-lightViolet`} />
    );
  }

  const name = filenameOrPath.split(/[/\\]/).pop()?.toLowerCase() || '';
  const extIndex = name.lastIndexOf('.');
  const ext = extIndex !== -1 ? name.substring(extIndex).toLowerCase() : name;

  // Specific filename overrides
  if (name === 'package.json') {
    return <FileCode className={`${className} text-emerald-400`} />;
  }
  if (name === 'readme.md' || name.includes('license')) {
    return <FileText className={`${className} text-amber-400`} />;
  }
  if (name.startsWith('.env') || name === '.gitignore') {
    return <FileText className={`${className} text-gray-400`} />;
  }

  // File extension checks
  switch (ext) {
    case '.ts':
    case '.tsx':
      return <Code2 className={`${className} text-cyan-400`} />;
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return <Code2 className={`${className} text-yellow-400`} />;
    case '.json':
      return <FileCode className={`${className} text-yellow-300`} />;
    case '.md':
    case '.markdown':
    case '.txt':
      return <FileText className={`${className} text-amber-400`} />;
    case '.html':
    case '.htm':
      return <FileCode className={`${className} text-orange-400`} />;
    case '.css':
    case '.scss':
    case '.less':
      return <FileCode className={`${className} text-blue-400`} />;
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.webp':
    case '.gif':
    case '.ico':
      return <ImageIcon className={`${className} text-purple-400`} />;
    case '.svg':
      return <ImageIcon className={`${className} text-pink-400`} />;
    case '.pdf':
      return <FileText className={`${className} text-red-400`} />;
    case '.py':
      return <Code2 className={`${className} text-emerald-400`} />;
    case '.sql':
      return <FileCode className={`${className} text-teal-400`} />;
    case '.yaml':
    case '.yml':
      return <FileCode className={`${className} text-[#A9452D]`} />;
    default:
      if (name.includes('.tsx') || name.includes('.ts')) return <Code2 className={`${className} text-cyan-400`} />;
      if (name.includes('.jsx') || name.includes('.js')) return <Code2 className={`${className} text-yellow-400`} />;
      return <File className={`${className} text-crafted-text-muted`} />;
  }
}
