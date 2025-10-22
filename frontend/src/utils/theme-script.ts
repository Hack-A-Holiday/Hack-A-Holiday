/**
 * Theme Script for preventing FOUC (Flash of Unstyled Content)
 * This script should be injected into the document head to apply theme immediately
 */

export const themeScript = `
(function() {
  function getInitialTheme() {
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
  }
  
  function applyTheme(isDark) {
    // Add preload class to prevent transitions during initial load
    document.documentElement.classList.add('preload');
    
    if (isDark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    
    // Remove preload class after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
          document.documentElement.classList.remove('preload');
        }, 100);
      });
    } else {
      setTimeout(function() {
        document.documentElement.classList.remove('preload');
      }, 100);
    }
  }
  
  // Apply theme immediately
  const isDark = getInitialTheme();
  applyTheme(isDark);
  
  // Save preference if not already saved
  if (localStorage.getItem('darkMode') === null) {
    localStorage.setItem('darkMode', isDark.toString());
  }
})();
`;

/**
 * Get the theme script as a string for injection into HTML
 */
export const getThemeScriptString = (): string => {
  return themeScript;
};