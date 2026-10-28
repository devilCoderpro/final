import { useState, useEffect } from 'react';

export type OperatingSystem = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'other';
export type ScreenCategory = 'mobile' | 'tablet' | 'laptop' | 'desktop';

export interface PlatformInfo {
  os: OperatingSystem;
  osName: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isApple: boolean;
  isStandalone: boolean;
  hasTouch: boolean;
  modKey: '⌘' | 'Ctrl';
  altKey: '⌥' | 'Alt';
  screenCategory: ScreenCategory;
  screenWidth: number;
  screenHeight: number;
}

export function usePlatform(): PlatformInfo {
  const [platform, setPlatform] = useState<PlatformInfo>(() => detectPlatform());

  useEffect(() => {
    const handleResize = () => {
      setPlatform(detectPlatform());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return platform;
}

function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      os: 'other',
      osName: 'Web',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isApple: false,
      isStandalone: false,
      hasTouch: false,
      modKey: 'Ctrl',
      altKey: 'Alt',
      screenCategory: 'laptop',
      screenWidth: 1200,
      screenHeight: 800,
    };
  }

  const userAgent = (navigator.userAgent || '').toLowerCase();
  const platformStr = (navigator.platform || '').toLowerCase();
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  // OS Detection
  let os: OperatingSystem = 'other';
  let osName = 'Cross-Platform';

  // Check iPadOS 13+ (reports as Macintosh with touch points)
  const isIPad = platformStr.includes('macintel') && maxTouchPoints > 1;
  const isIPhone = /iphone|ipod/.test(userAgent);
  const isIOS = isIPhone || isIPad || /ipad/.test(userAgent);

  const isAndroid = /android/.test(userAgent);
  const isMacOS = !isIOS && (/macintosh|mac os x/.test(userAgent) || platformStr.includes('mac'));
  const isWindows = /windows|win32|win64/.test(userAgent) || platformStr.includes('win');
  const isLinux = !isAndroid && (/linux/.test(userAgent) || platformStr.includes('linux'));

  if (isIOS) {
    os = 'ios';
    osName = isIPad ? 'iPadOS' : 'iOS';
  } else if (isAndroid) {
    os = 'android';
    osName = 'Android';
  } else if (isMacOS) {
    os = 'macos';
    osName = 'macOS';
  } else if (isWindows) {
    os = 'windows';
    osName = 'Windows';
  } else if (isLinux) {
    os = 'linux';
    osName = 'Linux';
  }

  const isApple = os === 'macos' || os === 'ios';
  const modKey = isApple ? '⌘' : 'Ctrl';
  const altKey = isApple ? '⌥' : 'Alt';

  // Standalone PWA detection
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  const width = window.innerWidth;
  const height = window.innerHeight;

  let screenCategory: ScreenCategory = 'desktop';
  if (width < 640) {
    screenCategory = 'mobile';
  } else if (width < 1024) {
    screenCategory = 'tablet';
  } else if (width < 1440) {
    screenCategory = 'laptop';
  } else {
    screenCategory = 'desktop';
  }

  const hasTouch = maxTouchPoints > 0 || 'ontouchstart' in window;
  const isMobile = screenCategory === 'mobile' || (hasTouch && width < 640);
  const isTablet = screenCategory === 'tablet' || (hasTouch && width >= 640 && width < 1024);
  const isDesktop = !isMobile && !isTablet;

  return {
    os,
    osName,
    isMobile,
    isTablet,
    isDesktop,
    isApple,
    isStandalone,
    hasTouch,
    modKey,
    altKey,
    screenCategory,
    screenWidth: width,
    screenHeight: height,
  };
}
