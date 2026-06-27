import { describe, it, expect } from 'vitest';

import { isBalancedMarkdown, normalizeMarkdown } from './markdownUtils';

describe('normalizeMarkdown', () => {
  it('should leave plain text unchanged', () => {
    expect(normalizeMarkdown('plain text')).toBe('plain text');
  });

  it('should decode common HTML entities into markdown markers', () => {
    expect(normalizeMarkdown('&ast;&ast;bold&ast;&ast;')).toBe('**bold**');
    expect(normalizeMarkdown('&num; 标题')).toBe('# 标题');
    expect(normalizeMarkdown('&dash;列表项')).toBe('-列表项');
    expect(normalizeMarkdown('&gt; 引用')).toBe('> 引用');
    expect(normalizeMarkdown('&lt;div&gt;')).toBe('<div>');
    expect(normalizeMarkdown('A &amp; B')).toBe('A & B');
  });

  it('should decode extended HTML entities', () => {
    expect(normalizeMarkdown('&mdash;')).toBe('—');
    expect(normalizeMarkdown('&ndash;')).toBe('–');
    expect(normalizeMarkdown('&quot;quote&quot;')).toBe('"quote"');
    expect(normalizeMarkdown('&apos;apostrophe&apos;')).toBe("'apostrophe'");
    expect(normalizeMarkdown('&nbsp;')).toBe('\u00A0');
  });

  it('should normalize full-width asterisks and backticks', () => {
    expect(normalizeMarkdown('＊＊bold＊＊')).toBe('**bold**');
    expect(normalizeMarkdown('＊italic＊')).toBe('*italic*');
    expect(normalizeMarkdown('｀code｀')).toBe('`code`');
  });

  it('should normalize single-escaped markdown markers', () => {
    expect(normalizeMarkdown('\\*\\*bold\\*\\*')).toBe('**bold**');
    expect(normalizeMarkdown('\\*italic\\*')).toBe('*italic*');
    expect(normalizeMarkdown('\\`code\\`')).toBe('`code`');
    expect(normalizeMarkdown('\\# 标题')).toBe('# 标题');
    expect(normalizeMarkdown('\\- 列表项')).toBe('- 列表项');
    expect(normalizeMarkdown('\\> 引用')).toBe('> 引用');
    expect(normalizeMarkdown('\\~\\~删除线\\~\\~')).toBe('~~删除线~~');
    expect(normalizeMarkdown('\\_下划线\\_')).toBe('_下划线_');
  });

  it('should normalize double-escaped markdown markers', () => {
    expect(normalizeMarkdown('\\\\*\\\\*bold\\\\*\\\\*')).toBe('**bold**');
    expect(normalizeMarkdown('\\\\*italic\\\\*')).toBe('*italic*');
    expect(normalizeMarkdown('\\\\`code\\\\`')).toBe('`code`');
    expect(normalizeMarkdown('\\\\# 标题')).toBe('# 标题');
    expect(normalizeMarkdown('\\\\- 列表项')).toBe('- 列表项');
    expect(normalizeMarkdown('\\\\> 引用')).toBe('> 引用');
    expect(normalizeMarkdown('\\\\~\\\\~删除线\\\\~\\\\~')).toBe('~~删除线~~');
    expect(normalizeMarkdown('\\\\_下划线\\\\_')).toBe('_下划线_');
  });

  it('should preserve nested asterisk emphasis structure', () => {
    const input = '**这是*嵌套*强调**';
    expect(normalizeMarkdown(input)).toBe(input);
  });

  it('should join same cross-line emphasis markers with a space', () => {
    expect(normalizeMarkdown('foo **\n** bar')).toBe('foo ** ** bar');
    expect(normalizeMarkdown('foo *\n* bar')).toBe('foo * * bar');
    expect(normalizeMarkdown('foo `\n` bar')).toBe('foo ` ` bar');
  });

  it('should not join different cross-line markers', () => {
    expect(normalizeMarkdown('foo *\n** bar')).toBe('foo *\n** bar');
    expect(normalizeMarkdown('foo `\n** bar')).toBe('foo `\n** bar');
  });

  it('should not join same markers when only one side is present', () => {
    expect(normalizeMarkdown('**粗体\n文字')).toBe('**粗体\n文字');
    expect(normalizeMarkdown('文字\n**粗体')).toBe('文字\n**粗体');
  });
});

describe('isBalancedMarkdown', () => {
  it('should return true for balanced markers', () => {
    expect(isBalancedMarkdown('**bold** and *italic*')).toBe(true);
    expect(isBalancedMarkdown('`code`')).toBe(true);
    expect(isBalancedMarkdown('~~删除线~~')).toBe(true);
    expect(isBalancedMarkdown('**这是*嵌套*强调**')).toBe(true);
  });

  it('should return false for unclosed markers', () => {
    expect(isBalancedMarkdown('**bold')).toBe(false);
    expect(isBalancedMarkdown('*italic')).toBe(false);
    expect(isBalancedMarkdown('`code')).toBe(false);
    expect(isBalancedMarkdown('~~删除线')).toBe(false);
    expect(isBalancedMarkdown('**这是*嵌套*强调*')).toBe(false);
  });

  it('should detect unclosed markers after normalizing HTML entities', () => {
    expect(isBalancedMarkdown('&ast;&ast;未闭合')).toBe(false);
    expect(isBalancedMarkdown('&ast;&ast;已闭合&ast;&ast;')).toBe(true);
  });

  it('should detect unclosed markers after normalizing full-width symbols', () => {
    expect(isBalancedMarkdown('＊＊未闭合')).toBe(false);
    expect(isBalancedMarkdown('＊＊已闭合＊＊')).toBe(true);
  });

  it('should detect unclosed markers after normalizing double escapes', () => {
    expect(isBalancedMarkdown('\\\\*\\\\*未闭合')).toBe(false);
    expect(isBalancedMarkdown('\\\\*\\\\*已闭合\\\\*\\\\*')).toBe(true);
  });

  it('should consider cross-line markers balanced after joining', () => {
    expect(isBalancedMarkdown('foo **\n** bar')).toBe(true);
    expect(isBalancedMarkdown('foo *\n* bar')).toBe(true);
  });

  it('should treat markdown list markers as balanced', () => {
    expect(isBalancedMarkdown('* item')).toBe(true);
    expect(isBalancedMarkdown('* a\n* b\n* c')).toBe(true);
    expect(isBalancedMarkdown('* 列表项一\n* 列表项二')).toBe(true);
  });

  it('should ignore isolated asterisks surrounded by whitespace', () => {
    expect(isBalancedMarkdown('foo * bar')).toBe(true);
    expect(isBalancedMarkdown('3 * 4 = 12')).toBe(true);
  });

  it('should detect real unclosed italic markers mixed with lists', () => {
    expect(isBalancedMarkdown('* item *italic')).toBe(false);
    expect(isBalancedMarkdown('* item *italic*')).toBe(true);
  });

  it('should return true for plain text without markers', () => {
    expect(isBalancedMarkdown('plain text without markers')).toBe(true);
  });
});
