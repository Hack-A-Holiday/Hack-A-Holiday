/**
 * Dark Mode Styling Utilities
 * 
 * Provides consistent styling functions for components in both light and dark modes
 */

export interface ButtonStyleConfig {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'small' | 'medium' | 'large';
  isDarkMode: boolean;
  disabled?: boolean;
}

export interface DarkModeStyleProps {
  isDarkMode: boolean;
  variant?: 'primary' | 'secondary' | 'tertiary';
  interactive?: boolean;
  elevated?: boolean;
}

/**
 * Get standardized button styles based on configuration
 */
export const getButtonStyles = (config: ButtonStyleConfig): React.CSSProperties => {
  const { variant, size, isDarkMode, disabled = false } = config;

  // Base styles
  const baseStyles: React.CSSProperties = {
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    textDecoration: 'none',
    outline: 'none',
    opacity: disabled ? 0.6 : 1,
  };

  // Size-specific styles
  const sizeStyles: Record<string, React.CSSProperties> = {
    small: {
      padding: '8px 16px',
      fontSize: '0.875rem',
      minHeight: '32px',
    },
    medium: {
      padding: '12px 20px',
      fontSize: '1rem',
      minHeight: '40px',
    },
    large: {
      padding: '16px 24px',
      fontSize: '1.125rem',
      minHeight: '48px',
    },
  };

  // Variant-specific styles
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: isDarkMode 
        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
      boxShadow: isDarkMode 
        ? '0 4px 15px rgba(102, 126, 234, 0.4)'
        : '0 4px 15px rgba(102, 126, 234, 0.3)',
    },
    secondary: {
      background: isDarkMode 
        ? 'rgba(255, 255, 255, 0.1)'
        : '#ffffff',
      color: isDarkMode 
        ? '#e8eaed'
        : '#374151',
      border: isDarkMode 
        ? '2px solid rgba(255, 255, 255, 0.2)'
        : '2px solid #e5e7eb',
    },
    outline: {
      background: 'transparent',
      color: isDarkMode 
        ? '#e8eaed'
        : '#374151',
      border: isDarkMode 
        ? '2px solid rgba(255, 255, 255, 0.2)'
        : '2px solid #e5e7eb',
    },
    ghost: {
      background: 'transparent',
      color: isDarkMode 
        ? '#e8eaed'
        : '#374151',
      border: 'none',
    },
  };

  return {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };
};

/**
 * Get hover styles for buttons
 */
export const getButtonHoverStyles = (config: ButtonStyleConfig): React.CSSProperties => {
  const { variant, isDarkMode, disabled = false } = config;

  if (disabled) return {};

  const hoverStyles: Record<string, React.CSSProperties> = {
    primary: {
      transform: 'translateY(-2px)',
      boxShadow: isDarkMode 
        ? '0 6px 20px rgba(102, 126, 234, 0.6)'
        : '0 6px 20px rgba(102, 126, 234, 0.4)',
    },
    secondary: {
      transform: 'translateY(-2px)',
      background: isDarkMode 
        ? 'rgba(255, 255, 255, 0.15)'
        : '#f8fafc',
      borderColor: isDarkMode 
        ? 'rgba(255, 255, 255, 0.3)'
        : '#d1d5db',
    },
    outline: {
      background: isDarkMode 
        ? 'rgba(255, 255, 255, 0.05)'
        : '#f8fafc',
      borderColor: isDarkMode 
        ? 'rgba(255, 255, 255, 0.3)'
        : '#d1d5db',
    },
    ghost: {
      background: isDarkMode 
        ? 'rgba(255, 255, 255, 0.05)'
        : '#f8fafc',
    },
  };

  return hoverStyles[variant] || {};
};

/**
 * Get card styles based on configuration
 */
export const getCardStyles = (props: DarkModeStyleProps): React.CSSProperties => {
  const { isDarkMode, variant = 'primary', interactive = false, elevated = false } = props;

  const baseStyles: React.CSSProperties = {
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    border: isDarkMode 
      ? '1px solid rgba(255, 255, 255, 0.08)'
      : '1px solid #e5e7eb',
  };

  const backgroundStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: isDarkMode ? '#252d3d' : '#ffffff',
      color: isDarkMode ? '#e8eaed' : '#1f2937',
    },
    secondary: {
      background: isDarkMode ? '#1a1f2e' : '#f8fafc',
      color: isDarkMode ? '#e8eaed' : '#1f2937',
    },
    tertiary: {
      background: isDarkMode ? '#2d3548' : '#ffffff',
      color: isDarkMode ? '#e8eaed' : '#1f2937',
    },
  };

  const shadowStyles: React.CSSProperties = {
    boxShadow: elevated 
      ? (isDarkMode 
          ? '0 10px 25px rgba(0, 0, 0, 0.6)'
          : '0 10px 25px rgba(0, 0, 0, 0.1)')
      : (isDarkMode 
          ? '0 5px 20px rgba(0, 0, 0, 0.4)'
          : '0 5px 20px rgba(0, 0, 0, 0.05)'),
  };

  const interactiveStyles: React.CSSProperties = interactive 
    ? {
        cursor: 'pointer',
      }
    : {};

  return {
    ...baseStyles,
    ...backgroundStyles[variant],
    ...shadowStyles,
    ...interactiveStyles,
  };
};

/**
 * Get card hover styles
 */
export const getCardHoverStyles = (props: DarkModeStyleProps): React.CSSProperties => {
  const { isDarkMode, interactive = false } = props;

  if (!interactive) return {};

  return {
    transform: 'translateY(-4px)',
    boxShadow: isDarkMode 
      ? '0 15px 30px rgba(0, 0, 0, 0.7)'
      : '0 15px 30px rgba(0, 0, 0, 0.1)',
    borderColor: isDarkMode 
      ? 'rgba(255, 255, 255, 0.15)'
      : '#d1d5db',
  };
};

/**
 * Get form input styles
 */
export const getInputStyles = (isDarkMode: boolean, hasError = false): React.CSSProperties => {
  return {
    width: '100%',
    padding: '12px 16px',
    border: `2px solid ${hasError 
      ? (isDarkMode ? '#ef4444' : '#ef4444')
      : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb')}`,
    borderRadius: '8px',
    background: isDarkMode ? '#1a1f2e' : '#ffffff',
    color: isDarkMode ? '#e8eaed' : '#1f2937',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.3s ease',
  };
};

/**
 * Get form input focus styles
 */
export const getInputFocusStyles = (isDarkMode: boolean): React.CSSProperties => {
  return {
    background: isDarkMode ? '#252d3d' : '#ffffff',
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  };
};

/**
 * Get navigation styles
 */
export const getNavStyles = (isDarkMode: boolean): React.CSSProperties => {
  return {
    background: isDarkMode ? '#1a1f2e' : '#ffffff',
    borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e5e7eb'}`,
    color: isDarkMode ? '#e8eaed' : '#1f2937',
  };
};

/**
 * Get navigation link styles
 */
export const getNavLinkStyles = (isDarkMode: boolean, isActive = false): React.CSSProperties => {
  return {
    color: isActive 
      ? (isDarkMode ? '#ffffff' : '#111827')
      : (isDarkMode ? '#e8eaed' : '#1f2937'),
    textDecoration: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
    background: isActive 
      ? (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f8fafc')
      : 'transparent',
  };
};

/**
 * Get navigation link hover styles
 */
export const getNavLinkHoverStyles = (isDarkMode: boolean): React.CSSProperties => {
  return {
    background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
    color: isDarkMode ? '#ffffff' : '#111827',
  };
};

/**
 * Performance optimization: Pre-computed style objects
 */
export const DARK_MODE_STYLES = {
  light: {
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      tertiary: '#9ca3af',
    },
    border: {
      primary: '#e5e7eb',
      hover: '#d1d5db',
    },
  },
  dark: {
    background: {
      primary: '#0f1419',
      secondary: '#1a1f2e',
      tertiary: '#252d3d',
    },
    text: {
      primary: '#e8eaed',
      secondary: '#9ca3af',
      tertiary: '#6b7280',
    },
    border: {
      primary: 'rgba(255, 255, 255, 0.08)',
      hover: 'rgba(255, 255, 255, 0.15)',
    },
  },
} as const;

/**
 * Get optimized theme styles
 */
export const getThemeStyles = (isDarkMode: boolean) => {
  return isDarkMode ? DARK_MODE_STYLES.dark : DARK_MODE_STYLES.light;
};