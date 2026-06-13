import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isMedianApp } from '@/lib/median';

export interface AppVersion {
  id: string;
  version_code: number;
  version_name: string;
  apk_url: string;
  release_notes: string | null;
  is_mandatory: boolean;
  min_supported_version_code: number;
}

interface UseAppUpdateResult {
  installedCode: number | null;
  installedName: string | null;
  latest: AppVersion | null;
  needsUpdate: boolean;
  isMandatory: boolean;
  loading: boolean;
  dismiss: () => void;
  isDismissed: boolean;
}

const DISMISS_KEY = 'app_update_dismissed_v';

/**
 * Reads the installed APK version via Capacitor and compares against the
 * latest active row in `app_versions`. Returns whether an update is needed.
 * Web/preview users always get `needsUpdate=false` (nothing to update).
 */
export function useAppUpdate(): UseAppUpdateResult {
  const [installedCode, setInstalledCode] = useState<number | null>(null);
  const [installedName, setInstalledName] = useState<string | null>(null);
  const [latest, setLatest] = useState<AppVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedFor, setDismissedFor] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const v = localStorage.getItem(DISMISS_KEY);
    return v ? Number(v) : null;
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Read installed version (native only)
      if (isMedianApp) {
        try {
          const { App } = await import('@capacitor/app');
          const info = await App.getInfo();
          if (!cancelled) {
            // build is a string but represents version_code on Android
            const code = Number(info.build);
            setInstalledCode(Number.isFinite(code) ? code : 1);
            setInstalledName(info.version);
          }
        } catch {
          if (!cancelled) {
            setInstalledCode(1);
            setInstalledName('1.0.0');
          }
        }
      }

      // 2. Read latest active version from DB
      const { data } = await supabase
        .from('app_versions')
        .select('id, version_code, version_name, apk_url, release_notes, is_mandatory, min_supported_version_code')
        .eq('is_active', true)
        .order('version_code', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setLatest(data as AppVersion | null);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (!latest) return;
    localStorage.setItem(DISMISS_KEY, String(latest.version_code));
    setDismissedFor(latest.version_code);
  }, [latest]);

  const needsUpdate =
    isMedianApp &&
    !!latest &&
    installedCode !== null &&
    latest.version_code > installedCode;

  const isMandatory =
    needsUpdate && !!latest &&
    (latest.is_mandatory || installedCode! < latest.min_supported_version_code);

  const isDismissed =
    !isMandatory && latest !== null && dismissedFor === latest.version_code;

  return {
    installedCode,
    installedName,
    latest,
    needsUpdate,
    isMandatory,
    loading,
    dismiss,
    isDismissed,
  };
}
