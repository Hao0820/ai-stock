import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from '../contexts/LanguageContext';

interface SentimentPieChartProps {
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  isLoading?: boolean;
}

export const SentimentPieChart: React.FC<SentimentPieChartProps> = ({ sentiment, isLoading }) => {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center animate-pulse">
        <div className="w-40 h-40 rounded-full border-8 border-on-surface/5"></div>
      </div>
    );
  }

  const total = sentiment.positive + sentiment.neutral + sentiment.negative || 1;
  const segments = [
    { percent: sentiment.positive / total, color: '#4EDE9F', gradient: 'posGrad', label: t('news.sentiment.positive'), start: 0, textCol: 'text-primary' },
    { percent: sentiment.neutral / total, color: '#94A3B8', gradient: 'neuGrad', label: t('news.sentiment.neutral'), start: sentiment.positive / total, textCol: 'text-on-surface-variant' },
    { percent: sentiment.negative / total, color: '#FF5252', gradient: 'negGrad', label: t('news.sentiment.negative'), start: (sentiment.positive + sentiment.neutral) / total, textCol: 'text-error' },
  ];

  const size = 160;
  const center = size / 2;
  const radius = 60;
  const strokeWidth = 14;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const createArc = (startPercent: number, endPercent: number) => {
    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);
    const largeArcFlag = endPercent - startPercent > 0.5 ? 1 : 0;
    return `M ${center + radius * startX} ${center + radius * startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${center + radius * endX} ${center + radius * endY}`;
  };

  return (
    <div className="flex flex-col xl:flex-row items-center gap-6 py-4 w-full">
      {/* Chart Section */}
      <div className="flex flex-col items-center gap-4 shrink-0">
        <div className="relative w-44 h-44 group">
          {/* Outer glow based on majority sentiment */}
          <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 transition-colors duration-1000 ${
            sentiment.positive > 0.5 ? 'bg-primary' : sentiment.negative > 0.4 ? 'bg-error' : 'bg-secondary'
          }`} />
          
          <svg viewBox={`0 0 ${size} ${size}`} className="relative transform -rotate-90 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10 w-full h-full">
            <defs>
              <linearGradient id="posGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4EDE9F" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <linearGradient id="neuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#64748B" />
              </linearGradient>
              <linearGradient id="negGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF5252" />
                <stop offset="100%" stopColor="#DC2626" />
              </linearGradient>
            </defs>
            
            {/* Background track */}
            <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-white/5" />
            
            {segments.map((seg, i) => (
              seg.percent > 0 && (
                <motion.path
                  key={i}
                  d={createArc(seg.start, seg.start + seg.percent)}
                  fill="none"
                  stroke={`url(#${seg.gradient})`}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut", delay: i * 0.1 }}
                />
              )
            ))}
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-50 mb-[-4px]">
              {t('news.sentiment.positive')}
            </span>
            <span className="text-4xl font-headline font-black text-on-surface">
              {Math.round(sentiment.positive * 100)}%
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          {(() => {
            if (sentiment.positive >= 0.6) return (
              <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-headline font-black text-primary tracking-tight">
                {t('history.sentiment.bullish')}
              </motion.span>
            );
            if (sentiment.negative >= 0.4) return (
              <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-headline font-black text-error tracking-tight">
                {t('history.sentiment.bearish')}
              </motion.span>
            );
            return (
              <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-headline font-black text-on-surface-variant tracking-tight">
                {t('history.sentiment.neutral')}
              </motion.span>
            );
          })()}
        </div>
      </div>

      {/* Legend Stats */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {segments.map((seg, i) => (
          <div key={i} className="group flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: seg.color }}></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant group-hover:text-on-surface transition-colors">
                  {seg.label}
                </span>
              </div>
              <span className={`text-lg font-headline font-black ${seg.textCol}`}>
                {Math.round(seg.percent * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${seg.percent * 100}%` }}
                transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                className="h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]" 
                style={{ backgroundColor: seg.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
