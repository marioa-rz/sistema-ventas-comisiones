'use client';

import React, { createContext, useContext, useState } from 'react';

interface CatalogSearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const CatalogSearchContext = createContext<CatalogSearchContextType | undefined>(undefined);

export function CatalogSearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <CatalogSearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      {children}
    </CatalogSearchContext.Provider>
  );
}

export function useCatalogSearch(): CatalogSearchContextType {
  const context = useContext(CatalogSearchContext);
  if (!context) {
    return { searchQuery: '', setSearchQuery: () => {} };
  }
  return context;
}
