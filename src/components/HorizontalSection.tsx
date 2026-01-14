import React, { memo, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Song } from '@/contexts/PlayerContext';
import DownloadAllButton from './DownloadAllButton';

interface HorizontalSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onSeeAll?: () => void;
  songs?: Song[]; // Optional songs array for bulk download
}

const HorizontalSection = memo(({ title, subtitle, children, onSeeAll, songs }: HorizontalSectionProps) => {
  return (
    <section className="mb-8">
      {/* Header - iOS 18 style */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h2 className="text-[20px] md:text-[22px] font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[13px] text-muted-foreground/70 mt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {songs && songs.length > 0 && (
            <DownloadAllButton songs={songs} />
          )}
          {onSeeAll && (
            <button
              className="flex items-center gap-0.5 text-[14px] text-primary font-semibold active:opacity-60 transition-opacity"
              onClick={onSeeAll}
            >
              See All
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Horizontal Scroll - optimized for performance */}
      <div 
        className="flex gap-3 overflow-x-auto pb-3 hide-scrollbar snap-x snap-mandatory -mx-5 px-5 scroll-smooth"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {children}
      </div>
    </section>
  );
});

HorizontalSection.displayName = 'HorizontalSection';

export default HorizontalSection;
