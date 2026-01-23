import { useEffect, useState, useCallback } from 'react';
import Median from 'median-js-bridge';

export const useMedian = () => {
  const [isReady, setIsReady] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');

  useEffect(() => {
    // Check if running in Median native app
    const userAgent = navigator.userAgent;
    const isMedianIOS = userAgent.indexOf('MedianIOS') > -1;
    const isMedianAndroid = userAgent.indexOf('MedianAndroid') > -1;
    
    setIsNativeApp(isMedianIOS || isMedianAndroid);
    setPlatform(isMedianIOS ? 'ios' : isMedianAndroid ? 'android' : 'web');

    // Initialize Median when ready
    Median.onReady(() => {
      setIsReady(true);
    });
  }, []);

  const getDeviceInfo = useCallback(async () => {
    if (!isNativeApp) return null;
    try {
      return await Median.deviceInfo();
    } catch (error) {
      console.error('Failed to get device info:', error);
      return null;
    }
  }, [isNativeApp]);

  const share = useCallback(async (url: string, text?: string) => {
    if (!isNativeApp) {
      // Fallback to web share API
      if (navigator.share) {
        await navigator.share({ url, text });
      }
      return;
    }
    try {
      Median.share.sharePage({ url, text });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  }, [isNativeApp]);

  const setStatusBarStyle = useCallback((style: 'light' | 'dark' | 'auto', color?: string) => {
    if (!isNativeApp) return;
    try {
      Median.statusbar.set({ 
        style, 
        color: color || '#000000',
        overlay: false,
        blur: false
      });
    } catch (error) {
      console.error('Failed to set status bar style:', error);
    }
  }, [isNativeApp]);

  const hapticFeedback = useCallback((type: 'impactLight' | 'impactMedium' | 'impactHeavy' = 'impactMedium') => {
    if (!isNativeApp) return;
    try {
      Median.haptics.trigger({ style: type });
    } catch (error) {
      console.error('Failed to trigger haptic feedback:', error);
    }
  }, [isNativeApp]);

  return {
    isReady,
    isNativeApp,
    platform,
    Median,
    getDeviceInfo,
    share,
    setStatusBarStyle,
    hapticFeedback,
  };
};

export default useMedian;
