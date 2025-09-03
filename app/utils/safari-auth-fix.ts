// Safari-specific authentication fixes for iOS compatibility

export const isSafariOnIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const chrome = /CriOS|Chrome/.test(ua);
  
  return iOS && webkit && !chrome;
};

export const getSafeOrigin = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  
  // Safari on iOS sometimes has issues with location.origin
  try {
    return window.location.origin || 
           `${window.location.protocol}//${window.location.host}`;
  } catch (error) {
    console.warn('Error getting origin:', error);
    return '';
  }
};

export const safariStorageSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Test localStorage availability (Safari private mode blocks it)
    const testKey = '__safari_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('localStorage not available (Safari private mode?):', error);
    return false;
  }
};

export const handleSafariAuthRedirect = () => {
  if (!isSafariOnIOS()) return;
  
  // Safari on iOS needs explicit handling for auth redirects
  const urlParams = new URLSearchParams(window.location.search);
  const hasAuthParams = urlParams.has('access_token') || 
                       urlParams.has('refresh_token') || 
                       urlParams.has('code');
  
  if (hasAuthParams) {
    console.log('Safari auth redirect detected, processing...');
    // The Supabase client should handle this automatically
    // but we can add extra logging for debugging
  }
};

export const waitForDOMContentLoaded = (): Promise<void> => {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve());
    } else {
      resolve();
    }
  });
};