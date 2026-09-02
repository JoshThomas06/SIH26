import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';

export default function Loader({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const progressWidth = useTransform(count, (v) => `${v}%`);

  useEffect(() => {
    // Animate the counter from 0 to 100 over 3 seconds
    const animation = animate(count, 100, {
      duration: 3,
      ease: 'easeInOut', // smoother consistent ease
      onComplete: () => {
        // Wait half a second at 100% before fading out
        setTimeout(() => setLoading(false), 500);
      }
    });

    return () => animation.stop();
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loader"
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100vh' }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }} // smoother fade and lift
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'var(--background, #000)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              color: 'var(--foreground, #eee)',
              fontFamily: '"Google Sans", "Google_Sans", sans-serif'
            }}
          >
            {/* Progress Bar Track */}
            <div style={{
              width: '100%',
              height: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)', // dark track
              position: 'relative'
            }}>
              {/* Progress Bar Fill */}
              <motion.div
                style={{
                  height: '100%',
                  backgroundColor: 'var(--foreground, #eee)',
                  width: progressWidth
                }}
              />
            </div>

            {/* Percentage Text (Bottom Right) */}
            <div style={{
              position: 'absolute',
              bottom: '4vh',
              right: '4vw',
              display: 'flex',
              alignItems: 'baseline',
              fontWeight: 400,
              letterSpacing: 'normal'
            }}>
              <motion.span style={{ fontSize: '15vw', lineHeight: 0.8 }}>
                {rounded}
              </motion.span>
              <span style={{ fontSize: '4vw', marginLeft: '0.5vw', fontWeight: 400 }}>%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
