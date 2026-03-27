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
  const posAngle = (sentiment.positive / total) * 360;
  const neuAngle = (sentiment.neutral / total) * 360;
  // const negAngle = (sentiment.negative / total) * 360;

  // SVG parameters
  const size = 160;
  const center = size / 2;
  const radius = 60;
  const strokeWidth = 12;

  // Path helpers
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

  const segments = [
    { percent: sentiment.positive / total, color: '#4EDE9F', label: t('news.sentiment.positive'), start: 0 },
    { percent: sentiment.neutral / total, color: '#94A3B8', label: t('news.sentiment.neutral'), start: sentiment.positive / total },
    { percent: sentiment.negative / total, color: '#FF5252', label: t('news.sentiment.negative'), start: (sentiment.positive + sentiment.neutral) / total },
  ];

  return (
    <div className="flex flex-col md:flex-row items-center justify-around gap-8 py-8 w-full max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-40 h-40">
          <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 drop-shadow-2xl">
            {segments.map((seg, i) => (
              seg.percent > 0 && (
                <motion.path
                  key={i}
                  d={createArc(seg.start, seg.start + seg.percent)}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1, delay: i * 0.2 }}
                />
              )
            ))}
            {/* Background circle */}
            <circle cx={center} cy={center} r={radius} fill="none" stroke="white" strokeWidth={1} opacity="0.05" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-3xl font-headline font-extrabold text-on-surface">{Math.round(sentiment.positive * 100)}%</span>
          </div>
        </div>
        {(() => {
          if (sentiment.positive >= 0.6) return <span className="text-3xl font-headline font-bold text-primary">{t('history.sentiment.bullish')}</span>;
          if (sentiment.negative >= 0.4) return <span className="text-3xl font-headline font-bold text-error">{t('history.sentiment.bearish')}</span>;
          return <span className="text-3xl font-headline font-bold text-secondary">{t('history.sentiment.neutral')}</span>;
        })()}
      </div>

      <div className="grid grid-cols-1 gap-3 w-full">
         {segments.map((seg, i) => (
           <div key={i} className="flex items-center gap-3 bg-surface-container-low px-4 py-3 rounded-2xl border border-white/5 w-full">
             <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }}></div>
             <div className="flex flex-col flex-1">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{seg.label}</span>
                <span className="text-sm font-bold text-on-surface">{Math.round(seg.percent * 100)}%</span>
             </div>
             <div className="w-12 h-1 bg-surface-container-high rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${seg.percent * 100}%` }}
                  className="h-full" 
                  style={{ backgroundColor: seg.color }}
                />
             </div>
           </div>
         ))}
      </div>
    </div>
  );
};
