import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const MOBILE_MEDIA = '(max-width: 820px)';

function readMatch(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_MEDIA).matches;
}

function readOverride(search: string): 'mobile' | 'desktop' | null {
  const v = new URLSearchParams(search).get('shell');
  return v === 'mobile' || v === 'desktop' ? v : null;
}

export function useIsMobile(): boolean {
  const location = useLocation();
  const [matches, setMatches] = useState<boolean>(readMatch);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_MEDIA);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const override = readOverride(location.search);
  if (override) return override === 'mobile';
  return matches;
}
