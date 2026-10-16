'use client';

// Copy-to-clipboard button (prototype `auth-admin.jsx` AuthJwks "copy").
import { useState, type CSSProperties } from 'react';

export function CopyButton({ text, label, copiedLabel, style }: { text: string; label: string; copiedLabel: string; style: CSSProperties }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard can be blocked (permissions, insecure context); the text stays selectable.
    }
  };
  return (
    <button type="button" onClick={onCopy} style={style}>
      {copied ? copiedLabel : label}
    </button>
  );
}
