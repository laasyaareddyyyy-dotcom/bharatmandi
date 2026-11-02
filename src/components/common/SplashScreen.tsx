import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { useMandi } from '../../context/MandiContext';

interface SplashScreenProps {
  onFinish: () => void;
  holdDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  holdDurationMs = 1800,
}) => {
  const [progress, setProgress] = useState(0);
  const { language } = useMandi();

  const onFinishRef = useRef(onFinish);
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / holdDurationMs) * 100));
      setProgress(pct);

      if (elapsed >= holdDurationMs) {
        clearInterval(interval);
        if (!hasFinishedRef.current) {
          hasFinishedRef.current = true;
          onFinishRef.current();
        }
      }
    }, 30);

    return () => {
      clearInterval(interval);
    };
  }, [holdDurationMs]);

  return (
    <AnimatePresence>
      <motion.div
        key="splash-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#DCEAF0] text-[#18364A] p-6 select-none overflow-hidden"
      >
        {/* Central Content Box */}
        <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
          {/* Deep Heritage Blue Logo Container with Popup Animation */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 12 }}
            animate={{ scale: [0.5, 1.04, 1], opacity: 1, y: 0 }}
            transition={{
              duration: 0.65,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative mb-6 flex justify-center items-center p-3 rounded-2xl bg-[#18364A] border border-[#18364A] shadow-md"
          >
            <img
              src="/bharat_mandi_logo.png"
              alt="Mandi Ledger Logo"
              referrerPolicy="no-referrer"
              className="w-32 h-32 sm:w-40 sm:h-40 object-contain relative z-10"
            />
          </motion.div>

          {/* App Name & Subtitle Fade-In */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="space-y-2 mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#18364A]">
              {language === 'hi' ? 'मंडी लेजर' : 'Mandi Ledger'}
            </h1>
            <div className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B69A5A]" />
              <p className="text-xs sm:text-sm text-[#24485E] font-semibold tracking-wide">
                {language === 'hi'
                  ? 'आपका व्यापार, सुव्यवस्थित।'
                  : 'Your business, organised.'}
              </p>
              <span className="w-1.5 h-1.5 rounded-full bg-[#B69A5A]" />
            </div>
          </motion.div>

          {/* Calm Loading Progress Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.35 }}
            className="w-full max-w-xs space-y-2"
          >
            <div className="h-2 w-full bg-[#B3C8D2] rounded-full overflow-hidden p-[1px]">
              <motion.div
                className="h-full bg-[#18364A] rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-[#24485E] font-medium font-mono px-1">
              <span>{language === 'hi' ? 'प्रारंभ हो रहा है...' : 'Loading...'}</span>
              <span className="font-semibold text-[#B69A5A]">{progress}%</span>
            </div>
          </motion.div>
        </div>

        {/* Footer Security Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: 0.45 }}
          className="absolute bottom-6 flex items-center gap-1.5 text-[11px] text-[#24485E] font-medium"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#B69A5A]" />
          <span>{language === 'hi' ? 'सुरक्षित मंडी डिजिटल खाता' : 'Secure Mandi Digital Ledger'}</span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};


