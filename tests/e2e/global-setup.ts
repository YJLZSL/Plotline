import { writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Pre-seed a Playwright storage state that disables the first-workspace
 * onboarding guide, so E2E tests do not get blocked by the modal overlay.
 */
export default async function globalSetup() {
  const storageStatePath = path.resolve('tests/e2e', '.storage-state.json');
  const uiState = JSON.stringify({ state: { firstWorkspaceVisit: false }, version: 0 });
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:1420',
        localStorage: [{ name: 'plotline:ui', value: uiState }],
      },
    ],
  };
  await writeFile(storageStatePath, JSON.stringify(storageState, null, 2));
}
