import React, { useState } from 'react';
import { Copy, Check, Code as CodeIcon } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split content into code block blocks vs prose blocks
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  let keyCounter = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      elements.push(<ProseBlock key={`prose-${keyCounter++}`} text={textBefore} />);
    }

    const language = match[1] || 'code';
    const codeText = match[2].trimEnd();
    elements.push(
      <CodeBlock key={`code-${keyCounter++}`} language={language} code={codeText} />
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    elements.push(<ProseBlock key={`prose-${keyCounter++}`} text={remainingText} />);
  }

  return <div className="space-y-2 text-xs leading-relaxed text-crafted-text font-sans">{elements}</div>;
};

// Sub-component: Fenced Code Block with Copy Action & Syntax Card
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="my-2.5 rounded-xl border border-crafted-border bg-[#14141d] overflow-hidden font-mono shadow-md">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between bg-[#1e1e2d] px-3 py-1.5 border-b border-crafted-border/60 text-[10px]">
        <div className="flex items-center space-x-1.5 text-crafted-text-dim">
          <CodeIcon className="h-3 w-3 text-crafted-brand-rust" />
          <span className="uppercase font-bold tracking-wider">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 text-crafted-text-dim hover:text-crafted-text transition-colors px-2 py-0.5 rounded hover:bg-crafted-surface"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <pre className="p-3 text-[11px] leading-relaxed text-emerald-300/90 overflow-x-auto whitespace-pre font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Sub-component: Prose Block (Headings, Lists, Bold, Italic, Inline Code)
const ProseBlock: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        // Headings
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-xs font-bold text-crafted-text mt-3 mb-1 font-sans tracking-tight">
              {renderFormattedInline(line.substring(4))}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-sm font-bold text-crafted-text mt-3 mb-1 font-sans tracking-tight border-b border-crafted-border/40 pb-1">
              {renderFormattedInline(line.substring(3))}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-base font-extrabold text-crafted-text mt-3 mb-1 font-sans">
              {renderFormattedInline(line.substring(2))}
            </h1>
          );
        }

        // List items
        const listMatch = line.match(/^(\d+\.|\*|-)\s+(.*)/);
        if (listMatch) {
          const bullet = listMatch[1];
          const itemText = listMatch[2];
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2 my-0.5 font-sans">
              <span className="font-mono text-[10px] text-crafted-brand-rust font-bold shrink-0 mt-0.5">
                {bullet.length === 1 ? '•' : bullet}
              </span>
              <div className="flex-1 min-w-0">{renderFormattedInline(itemText)}</div>
            </div>
          );
        }

        // Blockquotes
        if (line.startsWith('> ')) {
          return (
            <blockquote key={idx} className="border-l-2 border-crafted-brand-rust pl-3 py-0.5 my-1 text-crafted-text-muted italic bg-crafted-surface/30 rounded-r-lg">
              {renderFormattedInline(line.substring(2))}
            </blockquote>
          );
        }

        // Regular Paragraph Line
        return (
          <p key={idx} className="my-0.5 leading-relaxed">
            {renderFormattedInline(line)}
          </p>
        );
      })}
    </>
  );
};

// Helper: Formats inline markdown (bold **, italic *, inline code `code`)
function renderFormattedInline(text: string): React.ReactNode[] {
  // Regex to split by inline code, bold, or italic tokens
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?:\*|_)[^*_]+(?:\*|_))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];

    // Inline Code: `code`
    if (token.startsWith('`') && token.endsWith('`')) {
      const codeStr = token.substring(1, token.length - 1);
      parts.push(
        <code
          key={keyIndex++}
          className="rounded bg-[#1a1a24] border border-crafted-border/60 px-1.5 py-0.5 font-mono text-[11px] text-amber-300"
        >
          {codeStr}
        </code>
      );
    }
    // Bold: **text** or __text__
    else if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      const boldStr = token.substring(2, token.length - 2);
      parts.push(
        <strong key={keyIndex++} className="font-bold text-white tracking-wide">
          {boldStr}
        </strong>
      );
    }
    // Italic: *text* or _text_
    else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      const italicStr = token.substring(1, token.length - 1);
      parts.push(
        <em key={keyIndex++} className="italic text-crafted-text-muted">
          {italicStr}
        </em>
      );
    } else {
      parts.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}
