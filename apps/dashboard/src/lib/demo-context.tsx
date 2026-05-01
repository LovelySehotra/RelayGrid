import React, { createContext, useContext, useState } from 'react';

interface DemoCtx {
  isDemo: boolean;
  setIsDemo: (v: boolean) => void;
}

const DemoContext = createContext<DemoCtx>({ isDemo: true, setIsDemo: () => {} });

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemo, setIsDemo] = useState(() => !localStorage.getItem('relay_api_key'));
  return <DemoContext.Provider value={{ isDemo, setIsDemo }}>{children}</DemoContext.Provider>;
}

export const useDemo = () => useContext(DemoContext);
