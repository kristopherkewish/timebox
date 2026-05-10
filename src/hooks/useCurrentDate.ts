import { useSearchParams } from 'react-router-dom';

import { localISODate } from '@/lib/time';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function useCurrentDate(): string {
  const [params] = useSearchParams();
  const dateParam = params.get('date');
  return dateParam && ISO.test(dateParam) ? dateParam : localISODate();
}
