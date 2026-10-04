"use client";

import React from "react";

export interface SafeRichTextProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Only HTTPS links and same-site absolute paths are clickable. */
export function safeRichTextLink(href: string): string | null {
  const value = href.trim();
  if (/^https:\/\//i.test(value) || /^\/(?!\/)/.test(value)) return value;
  return null;
}

function inlineNodes(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let part = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    if (match[2] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${part}`}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      nodes.push(<code key={`${keyPrefix}-c-${part}`} className="rounded bg-black/5 px-1 py-0.5 text-[0.92em]">{match[3]}</code>);
    } else {
      const href = safeRichTextLink(match[5] || "");
      nodes.push(href ? (
        <a key={`${keyPrefix}-a-${part}`} href={href} target={href.startsWith("https://") ? "_blank" : undefined} rel={href.startsWith("https://") ? "noopener noreferrer" : undefined} className="underline underline-offset-2">
          {match[4]}
        </a>
      ) : <span key={`${keyPrefix}-t-${part}`}>{match[4]}</span>);
    }
    cursor = pattern.lastIndex;
    part += 1;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/** Safe Markdown-like text renderer. It never injects HTML. */
export function SafeRichText({ content, className = "", style }: SafeRichTextProps) {
  const lines = String(content || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      blocks.push(<div key={`h-${i}`} className={`${heading[1].length <= 2 ? "text-base" : "text-sm"} mt-2 mb-1 font-bold`}>{inlineNodes(heading[2], `h-${i}`)}</div>);
      i += 1; continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: React.ReactNode[] = []; const start = i;
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        const value = lines[i].replace(/^\s*[-*+]\s+/, "");
        items.push(<li key={`ul-${i}`}>{inlineNodes(value, `ul-${i}`)}</li>); i += 1;
      }
      blocks.push(<ul key={`ulb-${start}`} className="my-1 list-disc space-y-1 pl-5">{items}</ul>); continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: React.ReactNode[] = []; const start = i;
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        const value = lines[i].replace(/^\s*\d+[.)]\s+/, "");
        items.push(<li key={`ol-${i}`}>{inlineNodes(value, `ol-${i}`)}</li>); i += 1;
      }
      blocks.push(<ol key={`olb-${start}`} className="my-1 list-decimal space-y-1 pl-5">{items}</ol>); continue;
    }
    if (/^>\s?/.test(line)) {
      blocks.push(<blockquote key={`q-${i}`} className="my-1 border-l-2 border-current/30 pl-3 opacity-80">{inlineNodes(line.replace(/^>\s?/, ""), `q-${i}`)}</blockquote>);
      i += 1; continue;
    }
    blocks.push(<p key={`p-${i}`} className="my-1">{inlineNodes(line, `p-${i}`)}</p>); i += 1;
  }
  return <div className={`break-words [overflow-wrap:anywhere] ${className}`} style={style}>{blocks}</div>;
}
