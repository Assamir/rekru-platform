import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useMemo } from 'react';

marked.setOptions({ gfm: true, breaks: false });

export function Markdown({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(source, { async: false }) as string;
    return DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] });
  }, [source]);
  return <div className={`markdown ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
