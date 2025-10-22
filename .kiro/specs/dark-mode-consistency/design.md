# Dark Mode Consistency Design Document

## Overview

This design document outlines the comprehensive approach to achieving consistent dark mode styling throughout the Hack Travel application. The solution builds upon the existing dark mode infrastructure while addressing specific inconsistencies in form elements, calendar components, and interactive elements.

## Architecture

### Current Dark Mode Infrastructure

The application already has a solid foundation:
- `DarkModeContext.tsx` provides dark mode state management
- `globals.css` contains extensive dark mode CSS variables and base styles
- Components use `useDarkMode()` hook to access dark mode state

### Enhanced Architecture

```
Dark Mode System
├── Context Layer (DarkModeContext.tsx)
├── CSS Variables Layer (globals.css)
├── Component Styling Layer
│   ├── Form Components
│   ├── Calendar Components
│   ├── Interactive Elements
│   └── Content Cards
└── Utility Functions
    ├── Dark Mode Class Management
    └── Style Helpers
```

## Components and Interfaces

### 1. Enhanced CSS Variables System

Extend the existing CSS variables in `globals.css` to cover all component types:

```css
.dark-mode {
  /* Form-specific variables */
  --form-bg-primary: #1a1f2e;
  --form-bg-secondary: #252d3d;
  --form-border-color: rgba(255, 255, 255, 0.1);
  --form-border-focus: #667eea;
  --form-text-color: #e8eaed;
  --form-placeholder-color: rgba(255, 255, 255, 0.4);
  
  /* Calendar-specific variables */
  --calendar-bg: #1a1f2e;
  --calendar-border: rgba(255, 255, 255, 0.1);
  --calendar-icon-color: #9ca3af;
  --calendar-text-color: #e8eaed;
  
  /* Interactive element variables */
  --button-bg-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --button-bg-secondary: rgba(255, 255, 255, 0.1);
  --button-border-secondary: rgba(255, 255, 255, 0.2);
  --button-hover-transform: translateY(-2px);
  --button-hover-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  
  /* Card and container variables */
  --card-bg-primary: #252d3d;
  --card-bg-secondary: #1a1f2e;
  --card-border: rgba(255, 255, 255, 0.08);
  --card-shadow: 0 5px 20px rgba(0, 0, 0, 0.6);
}
```

### 2. Form Component Styling System

Create consistent styling for all form elements:

#### Input Fields
- Background: `var(--form-bg-primary)`
- Border: `2px solid var(--form-border-color)`
- Text: `var(--form-text-color)`
- Focus state: Border changes to `var(--form-border-focus)` with glow effect

#### Date Inputs
- Special handling for calendar icons
- Consistent styling with other input fields
- Proper contrast for date picker dropdowns

#### Select Dropdowns
- Dark background for dropdown options
- Consistent hover states
- Proper text contrast

### 3. Calendar Component Enhancement

#### Date Input Styling
```css
.dark-mode input[type="date"] {
  background: var(--calendar-bg);
  border: 2px solid var(--calendar-border);
  color: var(--calendar-text-color);
  
  /* Calendar icon styling */
  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
    opacity: 0.7;
  }
}
```

#### Calendar Dropdown Styling
- Dark background for calendar popup
- Consistent date selection states
- Proper hover effects for date cells

### 4. Interactive Elements System

#### Button Standardization
Create utility functions for consistent button styling:

```typescript
interface ButtonStyleConfig {
  variant: 'primary' | 'secondary' | 'outline';
  size: 'small' | 'medium' | 'large';
  isDarkMode: boolean;
}

const getButtonStyles = (config: ButtonStyleConfig) => {
  // Return consistent styling based on configuration
}
```

#### Hover and Focus States
- Consistent transform effects (`translateY(-2px)`)
- Standardized shadow effects
- Smooth transitions (0.2s ease)

### 5. Content Card System

#### Card Variants
- Primary cards: `var(--card-bg-primary)`
- Secondary cards: `var(--card-bg-secondary)`
- Elevated cards: Enhanced shadows and borders

#### Card Interactions
- Hover effects with transform and shadow changes
- Consistent border radius (12px-16px)
- Proper text hierarchy with color variations

## Data Models

### Dark Mode Configuration
```typescript
interface DarkModeConfig {
  isDarkMode: boolean;
  theme: 'light' | 'dark' | 'auto';
  transitions: boolean;
  customColors?: Partial<DarkModeColors>;
}

interface DarkModeColors {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    accent: string;
  };
  border: {
    primary: string;
    secondary: string;
    focus: string;
  };
  interactive: {
    primary: string;
    secondary: string;
    hover: string;
    focus: string;
  };
}
```

### Component Style Props
```typescript
interface DarkModeStyleProps {
  isDarkMode: boolean;
  variant?: 'primary' | 'secondary' | 'tertiary';
  interactive?: boolean;
  elevated?: boolean;
}
```

## Error Handling

### Fallback Styling
- Graceful degradation when CSS variables are not supported
- Default dark colors as fallbacks
- Progressive enhancement approach

### Theme Loading
- Prevent flash of unstyled content (FOUC)
- Immediate application of saved theme preference
- Smooth transitions only after initial load

### Browser Compatibility
- Vendor prefixes for CSS properties
- Polyfills for older browsers if needed
- Consistent behavior across different browsers

## Testing Strategy

### Visual Regression Testing
1. **Component Screenshots**: Capture before/after images of all components in both light and dark modes
2. **Cross-browser Testing**: Ensure consistency across Chrome, Firefox, Safari, and Edge
3. **Mobile Responsiveness**: Test dark mode on various screen sizes

### Functional Testing
1. **Theme Toggle Testing**: Verify smooth transitions when switching modes
2. **Persistence Testing**: Ensure theme preference is saved and restored
3. **Component Interaction Testing**: Test hover, focus, and active states

### Accessibility Testing
1. **Contrast Ratio Testing**: Ensure all text meets WCAG AA standards (4.5:1 ratio)
2. **Focus Indicator Testing**: Verify focus states are visible and consistent
3. **Screen Reader Testing**: Ensure dark mode doesn't affect screen reader functionality

### Performance Testing
1. **CSS Loading Performance**: Measure impact of additional CSS variables
2. **Transition Performance**: Ensure smooth animations don't cause jank
3. **Memory Usage**: Monitor for any memory leaks in theme switching

## Implementation Phases

### Phase 1: Core Infrastructure Enhancement
- Extend CSS variables system
- Update DarkModeContext if needed
- Create utility functions for consistent styling

### Phase 2: Form Components
- Update all input fields, selects, and textareas
- Fix date picker and calendar icon styling
- Implement consistent focus and hover states

### Phase 3: Interactive Elements
- Standardize button styling across all components
- Update link and navigation element styling
- Implement consistent hover and focus effects

### Phase 4: Content Cards and Containers
- Update hotel cards, flight cards, and destination cards
- Ensure consistent card interactions
- Fix any remaining container styling issues

### Phase 5: Testing and Refinement
- Comprehensive testing across all components
- Performance optimization
- Accessibility validation
- Cross-browser compatibility verification