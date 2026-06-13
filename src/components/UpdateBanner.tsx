import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Sparkles } from 'lucide-react';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function UpdateBanner() {
  const { needsUpdate, isMandatory, isDismissed, latest, installedName, dismiss } = useAppUpdate();
  const [forceOpen, setForceOpen] = useState(false);

  if (!needsUpdate || !latest) return null;

  const open = isMandatory || forceOpen;
  const showBanner = !isMandatory && !isDismissed;

  const handleDownload = () => {
    // Opens APK url in the system browser — Android then handles "install over"
    window.open(latest.apk_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed top-0 inset-x-0 z-[60] px-3 pt-[env(safe-area-inset-top)]"
          >
            <div className="mt-2 mx-auto max-w-md rounded-2xl border border-white/10 bg-gradient-to-r from-[#FF2D55]/95 to-[#FF6B9D]/95 backdrop-blur-xl shadow-2xl shadow-[#FF2D55]/30">
              <div className="flex items-center gap-3 p-3">
                <div className="shrink-0 size-9 rounded-full bg-white/20 grid place-items-center">
                  <Sparkles className="size-4 text-white" />
                </div>
                <button
                  onClick={() => setForceOpen(true)}
                  className="flex-1 text-left"
                >
                  <p className="text-[13px] font-semibold text-white leading-tight">
                    New version {latest.version_name} available
                  </p>
                  <p className="text-[11px] text-white/80 leading-tight">
                    Tap to see what's new
                  </p>
                </button>
                <button
                  onClick={dismiss}
                  className="shrink-0 size-8 grid place-items-center rounded-full text-white/80 hover:bg-white/10 active:bg-white/20"
                  aria-label="Dismiss update"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={open} onOpenChange={(o) => !isMandatory && setForceOpen(o)}>
        <DialogContent
          className="max-w-sm rounded-3xl border-white/10 bg-zinc-950/95 backdrop-blur-2xl"
          onPointerDownOutside={(e) => isMandatory && e.preventDefault()}
          onEscapeKeyDown={(e) => isMandatory && e.preventDefault()}
        >
          <DialogHeader>
            <div className="mx-auto mb-2 size-14 rounded-2xl bg-gradient-to-br from-[#FF2D55] to-[#FF6B9D] grid place-items-center shadow-lg shadow-[#FF2D55]/40">
              <Download className="size-7 text-white" />
            </div>
            <DialogTitle className="text-center text-white text-lg">
              Update available
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 px-1">
            <div className="flex items-center justify-center gap-2 text-sm text-white/70">
              <span className="px-2 py-0.5 rounded-full bg-white/5">v{installedName ?? '?'}</span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded-full bg-[#FF2D55]/20 text-[#FF6B9D] font-semibold">
                v{latest.version_name}
              </span>
            </div>

            {latest.release_notes && (
              <div className="rounded-xl bg-white/5 p-3 max-h-40 overflow-auto">
                <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed">
                  {latest.release_notes}
                </p>
              </div>
            )}

            {isMandatory && (
              <p className="text-[11px] text-amber-300/90 text-center">
                This update is required to keep using the app.
              </p>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={handleDownload}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] hover:opacity-90 text-white font-semibold"
              >
                <Download className="size-4 mr-2" />
                Download update
              </Button>
              {!isMandatory && (
                <button
                  onClick={() => {
                    setForceOpen(false);
                    dismiss();
                  }}
                  className="text-xs text-white/50 hover:text-white/80 py-1"
                >
                  Maybe later
                </button>
              )}
            </div>

            <p className="text-[10px] text-center text-white/40 pt-1">
              Android will install over your current app. Your data stays safe.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
