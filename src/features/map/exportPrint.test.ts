import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  finishMapPrintClass,
  printMapAsPdf,
  startMapPrintClass,
} from './export';

describe('printMapAsPdf', () => {
  afterEach(() => {
    document.documentElement.classList.remove('map-printing');
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should call window.print and add printing classes', async () => {
    window.print = vi.fn<() => void>();
    const root = document.createElement('div');
    document.body.appendChild(root);

    await printMapAsPdf({ rootElement: root });

    expect(window.print).toHaveBeenCalledOnce();
    expect(document.documentElement.classList.contains('map-printing')).toBe(true);
    expect(root.classList.contains('map-print-root')).toBe(true);
  });

  it('should remove printing classes when afterprint fires', async () => {
    window.print = vi.fn<() => void>();
    const root = document.createElement('div');
    document.body.appendChild(root);

    await printMapAsPdf({ rootElement: root });
    expect(document.documentElement.classList.contains('map-printing')).toBe(true);

    window.dispatchEvent(new Event('afterprint'));

    expect(document.documentElement.classList.contains('map-printing')).toBe(false);
    expect(root.classList.contains('map-print-root')).toBe(false);
  });

  it('should let startMapPrintClass and finishMapPrintClass add and remove classes', () => {
    const root = document.createElement('div');

    startMapPrintClass(root);
    expect(document.documentElement.classList.contains('map-printing')).toBe(true);
    expect(root.classList.contains('map-print-root')).toBe(true);

    finishMapPrintClass(root);
    expect(document.documentElement.classList.contains('map-printing')).toBe(false);
    expect(root.classList.contains('map-print-root')).toBe(false);
  });
});
