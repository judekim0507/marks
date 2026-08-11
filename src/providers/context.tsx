import { createContext, useContext, useState, type ReactNode } from 'react';

import { DEFAULT_PROVIDER } from '@/providers/registry';
import type { SchoolProvider } from '@/providers/types';

type SchoolContextValue = {
  school: SchoolProvider;
  setSchool: (provider: SchoolProvider) => void;
};

const SchoolContext = createContext<SchoolContextValue | null>(null);

export function SchoolProviderRoot({ children }: { children: ReactNode }) {
  const [school, setSchool] = useState<SchoolProvider>(DEFAULT_PROVIDER);
  return (
    <SchoolContext.Provider value={{ school, setSchool }}>
      {children}
    </SchoolContext.Provider>
  );
}

/** The active school system. Screens render exclusively from this. */
export function useSchool(): SchoolProvider {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used inside SchoolProviderRoot');
  }
  return context.school;
}
