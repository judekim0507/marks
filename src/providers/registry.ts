import { MyEdProvider } from '@/providers/myed';
import type { SchoolProvider } from '@/providers/types';

/**
 * Every available school system. OSS contributors: implement `SchoolProvider`
 * in `src/providers/<your-system>/` and add it here — nothing else in the app
 * needs to change.
 */
export const PROVIDERS: Record<string, SchoolProvider> = {
  [MyEdProvider.id]: MyEdProvider,
};

export const DEFAULT_PROVIDER = MyEdProvider;
