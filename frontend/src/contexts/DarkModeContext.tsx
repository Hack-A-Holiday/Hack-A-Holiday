import React, { createContext, useContext, useState, useEffect } from 'react';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isLoading: boolean;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};

// Function to get initial dark mode preference
const getInitialDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check localStorage first
  const savedMode = localStorage.getItem('darkMode');
  if (savedMode !== null) {
    return savedMode === 'true';
  }
  
  // Fall back to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return true;
  }
  
  return false;
};

// Function to apply theme immediately (prevents FOUC)
const applyThemeImmediately = (isDark: boolean) => {
  if (typeof document === 'undefined') return;
  
  // Add preload class to prevent transitions during initial load
  document.documentElement.classList.add('preload');
  
  if (isDark) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
  
  // Remove preload class after a short delay
  setTimeout(() => {
    document.documentElement.classList.remove('preload');
  }, 100);
};

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => getInitialDarkMode());
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme immediately on mount to prevent FOUC
  useEffect(() => {
    const initialMode = getInitialDarkMode();
    setIsDarkMode(initialMode);
    applyThemeImmediately(initialMode);
    
    // Save initial preference if not already saved
    if (localStorage.getItem('darkMode') === null) {
      localStorage.setItem('darkMode', initialMode.toString());
    }
    
    setIsLoading(false);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a preference
      const savedMode = localStorage.getItem('darkMode');
      if (savedMode === null) {
        const newMode = e.matches;
        setIsDarkMode(newMode);
        applyThemeImmediately(newMode);
        localStorage.setItem('darkMode', newMode.toString());
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('darkMode', newMode.toString());
      
      // Add transitioning class for smooth theme change
      document.documentElement.classList.add('theme-transitioning');
      
      if (newMode) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
      
      // Remove transitioning class after transition completes
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 400);
      
      return newMode;
    });
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode, isLoading }}>
      {children}
    </DarkModeContext.Provider>
  );
};
