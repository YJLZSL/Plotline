import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Markdown } from './Markdown';

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

  it('should preserve single line breaks as br elements', () => {
    render(<Markdown content={`第一行\n第二行`} />);
    const paragraphs = screen.getAllByText(/第[一二]行/);
    expect(paragraphs).toHaveLength(1);
    expect(document.querySelector('br')).toBeInTheDocument();
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

  it('should render headers and blockquotes', () => {
    render(<Markdown content={"> 引用内容\n\n## 二级标题"} />);
    expect(document.querySelector('blockquote')).toHaveTextContent('引用内容');
    expect(document.querySelector('h2')).toHaveTextContent('二级标题');
  });
});
