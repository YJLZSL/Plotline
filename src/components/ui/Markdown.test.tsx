import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Markdown } from './Markdown';
import { isBalancedMarkdown, normalizeMarkdown } from './markdownUtils';

describe('Markdown', () => {
  it('should render bold text when content contains **text**', () => {
    render(<Markdown content="这是 **粗体** 文字" />);
    const strong = screen.getByText('粗体');
    expect(strong.tagName).toBe('STRONG');
    expect(screen.queryByText('这是 **粗体** 文字')).not.toBeInTheDocument();
  });

  it('should render italic text when content contains *text*', () => {
    render(<Markdown content="这是 *斜体* 文字" />);
    const em = screen.getByText('斜体');
    expect(em.tagName).toBe('EM');
  });

  it('should render inline code when content contains `code`', () => {
    render(<Markdown content="使用 `console.log` 输出" />);
    const code = screen.getByText('console.log');
    expect(code.tagName).toBe('CODE');
  });

  it('should render code blocks with pre and code elements', () => {
    render(<Markdown content={"```js\nconst x = 1;\n```"} />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    expect(document.querySelector('pre')).toBeInTheDocument();
  });

  it('should preserve single line breaks without br elements', () => {
    render(<Markdown content={`第一行\n第二行`} />);
    const paragraph = screen.getByText(/第一行/);
    expect(paragraph).toBeInTheDocument();
    expect(document.querySelector('br')).not.toBeInTheDocument();
  });

  it('should sanitize raw HTML to prevent XSS', () => {
    render(<Markdown content="<script>alert('xss')</script>" />);
    expect(screen.queryByText("alert('xss')")).not.toBeInTheDocument();
    expect(document.querySelector('script')).not.toBeInTheDocument();
  });

  it('should render unordered lists', () => {
    render(<Markdown content={`- 项目一\n- 项目二`} />);
    expect(screen.getByText('项目一')).toBeInTheDocument();
    expect(screen.getByText('项目二')).toBeInTheDocument();
    expect(document.querySelector('ul')).toBeInTheDocument();
  });

  it('should render escaped markdown markers as formatting', () => {
    render(<Markdown content={String.raw`这是 \*\*粗体\*\*、\*斜体\* 和 \`代码\``} />);
    expect(screen.getByText('粗体').tagName).toBe('STRONG');
    expect(screen.getByText('斜体').tagName).toBe('EM');
    expect(screen.getByText('代码').tagName).toBe('CODE');
    expect(screen.queryByText('**粗体**')).not.toBeInTheDocument();
  });

  it('should render double-escaped markdown markers as formatting', () => {
    render(<Markdown content={String.raw`这是 \\*\\*粗体\\*\\*`} />);
    expect(screen.getByText('粗体').tagName).toBe('STRONG');
  });

  it('should decode HTML entities into markdown markers', () => {
    render(<Markdown content="这是 &ast;&ast;粗体&ast;&ast; 文字" />);
    expect(screen.getByText('粗体').tagName).toBe('STRONG');
  });

  it('should normalize full-width asterisks into markdown markers', () => {
    render(<Markdown content="这是 ＊＊粗体＊＊ 文字" />);
    expect(screen.getByText('粗体').tagName).toBe('STRONG');
  });

  it('should render GFM tables', () => {
    render(
      <Markdown
        content={`| 角色 | 身份 |\n| --- | --- |\n| 艾莉丝 | 主角 |\n| 凯尔 | 护卫 |`}
      />,
    );
    expect(screen.getByText('角色')).toBeInTheDocument();
    expect(screen.getByText('艾莉丝')).toBeInTheDocument();
    expect(document.querySelector('table')).toBeInTheDocument();
  });

  it('should render GFM task lists', () => {
    render(<Markdown content={"- [x] 已完成\n- [ ] 未完成"} />);
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(document.querySelector('input[type="checkbox"]')).toBeInTheDocument();
  });

  it('should render GFM strikethrough', () => {
    render(<Markdown content="这是 ~~删除线~~ 文字" />);
    const del = screen.getByText('删除线');
    expect(del.tagName).toBe('DEL');
  });

  it('should handle cross-line emphasis markers', () => {
    render(<Markdown content={"**粗体\n文字**"} />);
    const strong = screen.getByText(/粗体/);
    expect(strong.tagName).toBe('STRONG');
  });

  it('should render headers and blockquotes', () => {
    const content = "> 引用内容\n\n## 二级标题";
    render(<Markdown content={content} />);
    expect(document.querySelector('blockquote')).toHaveTextContent('引用内容');
    expect(document.querySelector('h2')).toHaveTextContent('二级标题');
  });

  it('should render nested emphasis inside bold text', () => {
    render(<Markdown content="**这是*嵌套*强调**" />);
    const strong = screen.getByText(/这是/);
    expect(strong.tagName).toBe('STRONG');
    expect(screen.getByText('嵌套').tagName).toBe('EM');
  });

  it('should render cross-line emphasis markers as a single strong element', () => {
    render(<Markdown content={"**粗体\n文字**"} />);
    const strong = screen.getByText(/粗体/);
    expect(strong.tagName).toBe('STRONG');
  });

  it('should render full-width asterisks as bold formatting', () => {
    render(<Markdown content="这是 ＊＊粗体＊＊ 文字" />);
    expect(screen.getByText('粗体').tagName).toBe('STRONG');
  });

  it('should decode additional HTML entities used by AI output', () => {
    render(<Markdown content="&mdash; 分隔线" />);
    expect(screen.getByText('— 分隔线')).toBeInTheDocument();
  });

  it('should not render a strong element for unclosed bold markers', () => {
    render(<Markdown content="**未闭合" />);
    expect(document.querySelector('strong')).not.toBeInTheDocument();
  });
});

describe('normalizeMarkdown', () => {
  it('should leave plain text unchanged', () => {
    expect(normalizeMarkdown('plain text')).toBe('plain text');
  });

  it('should normalize escaped markers', () => {
    expect(normalizeMarkdown(String.raw`\*\*bold\*\*`)).toBe('**bold**');
    expect(normalizeMarkdown(String.raw`\*italic\*`)).toBe('*italic*');
    expect(normalizeMarkdown(String.raw`\`code\``)).toBe('`code`');
  });

  it('should normalize double-escaped markers', () => {
    expect(normalizeMarkdown(String.raw`\\*\\*bold\\*\\*`)).toBe('**bold**');
  });

  it('should decode HTML entities', () => {
    expect(normalizeMarkdown('&ast;&ast;bold&ast;&ast;')).toBe('**bold**');
  });

  it('should normalize full-width asterisks', () => {
    expect(normalizeMarkdown('＊＊bold＊＊')).toBe('**bold**');
  });
});

describe('isBalancedMarkdown', () => {
  it('should return true for balanced markers', () => {
    expect(isBalancedMarkdown('**bold** and *italic*')).toBe(true);
    expect(isBalancedMarkdown('`code`')).toBe(true);
  });

  it('should return false for unclosed markers', () => {
    expect(isBalancedMarkdown('**bold')).toBe(false);
    expect(isBalancedMarkdown('`code')).toBe(false);
  });

  it('should treat list markers and isolated asterisks as balanced', () => {
    expect(isBalancedMarkdown('* item')).toBe(true);
    expect(isBalancedMarkdown('* a\n* b\n* c')).toBe(true);
    expect(isBalancedMarkdown('foo * bar')).toBe(true);
  });
});
