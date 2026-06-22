import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { RichEditor } from './RichEditor';

describe('RichEditor', () => {
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
});
