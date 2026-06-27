import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import rehypeSanitize from 'rehype-sanitize';

import { cn } from '@/lib/utils';

export interface MarkdownProps {
  content: string;
  className?: string;
}

function normalizeMarkdown(source: string): string {
  // 部分模型会转义 Markdown 标记（如 \*、\*\*、\`），导致界面显示原始星号。
  // 这里把成对/单个转义标记还原为普通 Markdown 语法，保留字面意义的反斜杠。
  return source
    .replace(/\\\*\\\*(.+?)\\\*\\\*/g, '**$1**')
    .replace(/\\\*(.+?)\\\*/g, '*$1*')
    .replace(/\\`(.+?)\\`/g, '`$1`')
    .replace(/\\#/g, '#')
    .replace(/\\-/g, '-')
    .replace(/\\>/g, '>');
}

export function Markdown({ content, className }: MarkdownProps) {
  const normalized = normalizeMarkdown(content);
  return (
    <div className={cn('markdown-body', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-text-primary">{children}</em>
          ),
          code: ({ className, children, ...props }) => {
            const isInline =
              className === undefined || !className.includes('language-');
            return (
              <code
                className={cn(
                  'font-mono text-xs rounded',
                  isInline
                    ? 'bg-bg-base px-1 py-0.5 text-accent'
                    : 'block bg-bg-base p-2 my-2 overflow-x-auto text-text-primary',
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="not-prose my-2">{children}</pre>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          h1: ({ children }) => (
            <h1 className="text-base font-semibold text-text-primary mb-2 mt-3 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-text-primary mb-2 mt-3 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-text-primary mb-2 mt-3 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-text-primary mb-2 mt-3 first:mt-0">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold text-text-primary mb-2 mt-3 first:mt-0">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-semibold text-text-primary mb-2 mt-3 first:mt-0">
              {children}
            </h6>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 italic text-text-secondary my-2">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border my-3" />,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
