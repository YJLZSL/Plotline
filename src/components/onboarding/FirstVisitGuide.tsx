import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CalendarPlus, Users, Bot, ChevronRight, ChevronLeft } from 'lucide-react';

import { Button, Dialog, DialogContent } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { MOTION_BASE } from '@/lib/motion';

interface FirstVisitGuideProps {
  open: boolean;
  onClose: () => void;
}

interface GuideStep {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
}

export function FirstVisitGuide({ open, onClose }: FirstVisitGuideProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  const steps: GuideStep[] = [
    {
      icon: <Sparkles className="h-8 w-8 text-accent" />,
      titleKey: 'onboarding.step1Title',
      descriptionKey: 'onboarding.step1Description',
    },
    {
      icon: <CalendarPlus className="h-8 w-8 text-accent" />,
      titleKey: 'onboarding.step2Title',
      descriptionKey: 'onboarding.step2Description',
    },
    {
      icon: <Users className="h-8 w-8 text-accent" />,
      titleKey: 'onboarding.step3Title',
      descriptionKey: 'onboarding.step3Description',
    },
    {
      icon: <Bot className="h-8 w-8 text-accent" />,
      titleKey: 'onboarding.step4Title',
      descriptionKey: 'onboarding.step4Description',
    },
  ];

  const totalSteps = steps.length;
  const current = steps[step]!;
  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title={t('onboarding.title')}
        description={t('onboarding.description', { current: step + 1, total: totalSteps })}
        className="max-w-md"
        data-testid="first-visit-guide"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={MOTION_BASE}
            className="flex flex-col items-center text-center py-2"
            data-testid={`guide-step-${step}`}
          >
            <div className="mb-4 p-4 rounded-full bg-accent/10">{current.icon}</div>
            <h3 className="text-base font-semibold text-text-primary mb-2">
              {t(current.titleKey)}
            </h3>
            <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
              {t(current.descriptionKey)}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-center gap-1.5 mt-2 mb-4">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              className="h-1.5 rounded-full transition-all"
              style={{ width: idx === step ? '1.5rem' : '0.375rem' }}
              aria-label={t('onboarding.goToStep', { step: idx + 1 })}
              data-testid={`guide-dot-${idx}`}
            >
              <span
                className={`block h-full w-full rounded-full ${
                  idx === step ? 'bg-accent' : 'bg-border'
                }`}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="guide-skip-btn">
            {t('onboarding.skip')}
          </Button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={handlePrev} data-testid="guide-prev-btn">
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t('onboarding.prev')}
              </Button>
            )}
            <Button size="sm" onClick={handleNext} data-testid="guide-next-btn">
              {isLast ? (
                t('onboarding.finish')
              ) : (
                <>
                  {t('onboarding.next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
