import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { useThemeStore, useUIStore } from '@/stores/ui';
import { RichEditor } from './RichEditor';

describe('RichEditor', () => {
  afterEach(() => {
    useUIStore.setState({ editorFollowsFontTheme: false });
    useThemeStore.setState({ fontTheme: 'sans' });
  });

  it('renders editor content and toolbar', () => {
    render(<RichEditor value="<p>Hello</p>" onChange={() => {}} placeholder="Type here" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(document.querySelector('[contenteditable="true"]')).toBeInTheDocument();
  });

  it('renders toolbar buttons', () => {
    render(<RichEditor value="" onChange={() => {}} />);
    expect(screen.getByTitle('粗体')).toBeInTheDocument();
    expect(screen.getByTitle('斜体')).toBeInTheDocument();
  });

  it('uses the editor font variable by default instead of a hardcoded class', () => {
    render(<RichEditor value="" onChange={() => {}} />);
    const wrapper = document.querySelector('[contenteditable="true"]')?.parentElement;
    expect(wrapper?.className ?? '').toContain('[font-family:var(--font-mono)]');
  });

  it('follows the UI font theme when the preference is enabled (B2)', () => {
    useUIStore.setState({ editorFollowsFontTheme: true });
    useThemeStore.setState({ fontTheme: 'sans' });
    render(<RichEditor value="" onChange={() => {}} />);
    const wrapper = document.querySelector('[contenteditable="true"]')?.parentElement;
    expect(wrapper?.className ?? '').toContain('[font-family:var(--font-sans)]');
  });
});
