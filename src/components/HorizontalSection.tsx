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
    <section className="mb-5">
      {/* Header - compact mobile style */}
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {songs && songs.length > 0 && (
            <DownloadAllButton songs={songs} />
          )}
          {onSeeAll && (
            <button
              className="flex items-center gap-0.5 text-sm text-primary font-semibold active:opacity-60 transition-opacity min-h-[44px] px-2"
              onClick={onSeeAll}
            >
              See All
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Horizontal Scroll - full width edge-to-edge */}
      <div 
        className="flex gap-2.5 overflow-x-auto pb-2 hide-scrollbar snap-x snap-mandatory -mx-3 px-3 scroll-smooth"
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
