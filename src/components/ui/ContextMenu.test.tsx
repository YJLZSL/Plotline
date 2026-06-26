import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSection,
} from './ContextMenu';

describe('ContextMenu', () => {
  it('opens a portal menu on right click and closes on item click', () => {
    const onClick = vi.fn();
    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div data-testid="trigger">Right click me</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onClick}>Edit</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSection label="Status">
            <ContextMenuItem disabled>Hidden</ContextMenuItem>
          </ContextMenuSection>
        </ContextMenuContent>
      </ContextMenu>,
    );

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByTestId('trigger'), {
      clientX: 100,
      clientY: 100,
      bubbles: true,
    });

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(menu).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div data-testid="trigger">Right click me</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Item</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'), {
      clientX: 0,
      clientY: 0,
    });

    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('supports arrow key navigation', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <div data-testid="trigger">Right click me</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>First</ContextMenuItem>
          <ContextMenuItem>Second</ContextMenuItem>
          <ContextMenuItem disabled>Disabled</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'), {
      clientX: 0,
      clientY: 0,
    });

    const menu = screen.getByRole('menu');
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveFocus();

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(items[0]).toHaveFocus();
  });

  it('works with asChild trigger', () => {
    const onClick = vi.fn();
    render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div data-testid="trigger">Right click me</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onClick}>Action</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByTestId('trigger'));
    expect(screen.getByRole('menuitem', { name: 'Action' })).toBeInTheDocument();
  });
});
