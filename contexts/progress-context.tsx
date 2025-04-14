"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Progress context type
type ProgressContextType = {
  chunkProgress: { current: number; total: number };
  updateChunkProgress: (current: number, total: number) => void;
  resetProgress: () => void;
};

// Create the context
const ProgressContext = createContext<ProgressContextType>({
  chunkProgress: { current: 0, total: 1 },
  updateChunkProgress: () => {},
  resetProgress: () => {},
});

// Custom hook to use the progress context
export const useProgress = () => useContext(ProgressContext);

// Progress provider component
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 1 });

  const updateChunkProgress = useCallback((current: number, total: number) => {
    setChunkProgress({ current, total });
  }, []);

  const resetProgress = useCallback(() => {
    setChunkProgress({ current: 0, total: 1 });
  }, []);

  return (
    <ProgressContext.Provider value={{ 
      chunkProgress, 
      updateChunkProgress, 
      resetProgress 
    }}>
      {children}
    </ProgressContext.Provider>
  );
}
