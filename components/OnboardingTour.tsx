import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Button } from './Button';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface Step {
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps: Step[] = [
  {
    targetId: 'tour-hero',
    title: 'Welcome to DziVan Smart',
    content: 'Experience the gold standard in construction estimation. We analyze multiple documents to give you precise budgets.',
    position: 'center'
  },
  {
    targetId: 'tour-upload',
    title: 'Multi-Document Upload',
    content: 'Drag and drop multiple Site Plans, Architectural Drawings, or PDFs here. We process them individually.',
    position: 'top'
  },
  {
    targetId: 'tour-analyze',
    title: 'Generate Grand Total',
    content: 'Our AI calculates estimates for each file and aggregates a Grand Total Budget with market trend analysis.',
    position: 'top'
  }
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateTargetPosition = () => {
    const step = steps[currentStep];
    const element = document.getElementById(step.targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      const timer = setTimeout(updateTargetPosition, 100);
      window.addEventListener('resize', updateTargetPosition);
      window.addEventListener('scroll', updateTargetPosition);
      return () => {
        window.removeEventListener('resize', updateTargetPosition);
        window.removeEventListener('scroll', updateTargetPosition);
        clearTimeout(timer);
      };
    }
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) onClose();
    else setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const getTooltipStyle = () => {
    if (!targetRect) {
        return { 
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            maxWidth: '400px', width: '90%'
        };
    }
    const gap = 20;
    const tooltipWidth = 320; 
    let top = 0;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
    let transform = '';

    if (step.position === 'top') {
        top = targetRect.top - gap;
        transform = 'translate(0, -100%)';
    } else if (step.position === 'bottom') {
        top = targetRect.bottom + gap;
    } else if (step.position === 'center') {
        top = targetRect.top + (targetRect.height / 2);
        left = targetRect.left + (targetRect.width / 2);
        transform = 'translate(-50%, -50%)';
    }

    if (left < 20) left = 20;
    if (left + tooltipWidth > window.innerWidth) left = window.innerWidth - tooltipWidth - 20;

    return { top, left, transform, width: `${tooltipWidth}px` };
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden font-sans">
        <div 
            className="absolute inset-0 transition-all duration-500 ease-in-out"
            style={{
                boxShadow: targetRect 
                    ? `0 0 0 9999px rgba(0, 0, 0, 0.85)` 
                    : `0 0 0 0 rgba(0, 0, 0, 0.85)`,
                top: targetRect ? targetRect.top - 8 : '50%',
                left: targetRect ? targetRect.left - 8 : '50%',
                width: targetRect ? targetRect.width + 16 : 0,
                height: targetRect ? targetRect.height + 16 : 0,
                borderRadius: '16px',
                pointerEvents: 'none'
            }}
        ></div>

        <div className="absolute inset-0 z-[-1]" onClick={(e) => e.stopPropagation()}></div>

        <div 
            className="absolute bg-neutral-900 p-6 rounded-2xl shadow-2xl border border-amber-500/30 flex flex-col gap-4 animate-in zoom-in duration-300"
            style={getTooltipStyle()}
        >
            <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 uppercase tracking-wider">
                    Step {currentStep + 1} / {steps.length}
                </span>
                <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                    {step.content}
                </p>
            </div>

            <div className="flex items-center justify-between mt-2 pt-4 border-t border-neutral-800">
                <button onClick={handlePrev} disabled={currentStep === 0} className="text-xs font-bold text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center uppercase tracking-wider">
                    <ChevronLeft className="w-3 h-3 mr-1" /> Back
                </button>
                <Button onClick={handleNext} variant="gold" className="py-1 px-4 text-xs h-8 text-neutral-900 font-bold">
                    {isLastStep ? 'Start Estimating' : 'Next'} {!isLastStep && <ChevronRight className="w-3 h-3 ml-1" />}
                </Button>
            </div>
        </div>
    </div>
  );
};