import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** 应用启动屏：暖色调渐变背景 + Logo 淡入，1.2s 后自动淡出。 */
export function SplashOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[200] grid place-items-center bg-bg-base"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, var(--accent-soft) 0%, var(--bg-base) 60%)',
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3"
            >
              <div className="h-16 w-16 rounded-[14px] bg-accent text-white grid place-items-center shadow-[var(--shadow-elevated)]">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M6 26 L6 6 M6 6 Q14 6 14 14 Q14 22 22 22 L26 22"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <circle cx="22" cy="22" r="2.5" fill="white" />
                </svg>
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-text-primary leading-tight">Plotline</h1>
                <p className="text-xs text-text-secondary">叙事创作工作台</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 80 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="h-0.5 bg-accent rounded-full"
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[11px] text-text-secondary/70"
            >
              正在准备你的故事…
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
