import { useEffect, useRef } from 'react';

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

export function useKonamiCode(onUnlock: () => void) {
  const indexRef = useRef(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const expected = KONAMI[indexRef.current];
      if (e.key === expected) {
        indexRef.current += 1;
        if (indexRef.current >= KONAMI.length) {
          indexRef.current = 0;
          onUnlock();
        }
      } else {
        indexRef.current = e.key === KONAMI[0] ? 1 : 0;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onUnlock]);
}
