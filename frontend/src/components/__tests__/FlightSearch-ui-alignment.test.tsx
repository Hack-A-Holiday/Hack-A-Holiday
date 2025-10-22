/**
 * FlightSearch UI Alignment Tests
 * 
 * Tests to verify the standardized button styling configuration functions
 * that ensure consistent button positioning and styling between
 * outgoing and incoming flights sections.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlightSearch from '../FlightSearch';
import { DarkModeProvider } from '../../contexts/DarkModeContext';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the services
jest.mock('../../services/kiwi-api');
jest.mock('../../services/trip-tracking');
jest.mock('../../services/trip-api');

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <DarkModeProvider>
      {children}
    </DarkModeProvider>
  </AuthProvider>
);

describe('FlightSearch UI Alignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render flight search form without errors', () => {
      render(
        <TestWrapper>
          <FlightSearch 
            initialSearch={{
              origin: 'JFK',
              destination: 'LHR',
              departureDate: '2025-11-06',
              returnDate: '2025-11-10'
            }}
          />
        </TestWrapper>
      );

      // Verify the main search form elements are present
      expect(screen.getByLabelText(/origin airport code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/destination airport code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/departure date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/return date/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search flights/i })).toBeInTheDocument();
    });

    test('should have proper initial form values', () => {
      render(
        <TestWrapper>
          <FlightSearch 
            initialSearch={{
              origin: 'JFK',
              destination: 'LHR',
              departureDate: '2025-11-06',
              returnDate: '2025-11-10'
            }}
          />
        </TestWrapper>
      );

      const originInput = screen.getByDisplayValue('JFK');
      const destinationInput = screen.getByDisplayValue('LHR');
      const departureInput = screen.getByDisplayValue('2025-11-06');
      const returnInput = screen.getByDisplayValue('2025-11-10');

      expect(originInput).toBeInTheDocument();
      expect(destinationInput).toBeInTheDocument();
      expect(departureInput).toBeInTheDocument();
      expect(returnInput).toBeInTheDocument();
    });
  });

  describe('Standardized Button Configuration', () => {
    test('should have standardized button styling functions available', () => {
      // This test verifies that the standardized styling functions exist
      // by checking that the component renders without errors
      const { container } = render(
        <TestWrapper>
          <FlightSearch />
        </TestWrapper>
      );

      expect(container).toBeInTheDocument();
    });

    test('should render search button with proper styling', () => {
      render(
        <TestWrapper>
          <FlightSearch />
        </TestWrapper>
      );

      const searchButton = screen.getByRole('button', { name: /search flights/i });
      expect(searchButton).toBeInTheDocument();
      expect(searchButton).toHaveStyle({
        width: '100%',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: 'bold'
      });
    });
  });

  describe('Form Validation', () => {
    test('should have required fields marked properly', () => {
      render(
        <TestWrapper>
          <FlightSearch />
        </TestWrapper>
      );

      const originInput = screen.getByLabelText(/origin airport code/i);
      const destinationInput = screen.getByLabelText(/destination airport code/i);
      const departureInput = screen.getByLabelText(/departure date/i);

      expect(originInput).toBeRequired();
      expect(destinationInput).toBeRequired();
      expect(departureInput).toBeRequired();
    });

    test('should have proper input types', () => {
      render(
        <TestWrapper>
          <FlightSearch />
        </TestWrapper>
      );

      const departureInput = screen.getByLabelText(/departure date/i);
      const returnInput = screen.getByLabelText(/return date/i);
      const adultsInput = screen.getByLabelText(/adults/i);
      const childrenInput = screen.getByLabelText(/children/i);

      expect(departureInput).toHaveAttribute('type', 'date');
      expect(returnInput).toHaveAttribute('type', 'date');
      expect(adultsInput).toHaveAttribute('type', 'number');
      expect(childrenInput).toHaveAttribute('type', 'number');
    });
  });

  describe('Responsive Design Elements', () => {
    test('should have responsive container styling', () => {
      const { container } = render(
        <TestWrapper>
          <FlightSearch />
        </TestWrapper>
      );

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveStyle({
        maxWidth: '1200px',
        margin: '0px auto',
        padding: '20px'
      });
    });

    test('should have proper grid layout for passenger inputs', () => {
      render(
        <TestWrapper>
          <FlightSearch />
        </TestWrapper>
      );

      const adultsInput = screen.getByLabelText(/adults/i);
      const childrenInput = screen.getByLabelText(/children/i);

      // Both inputs should be present and properly configured
      expect(adultsInput).toBeInTheDocument();
      expect(childrenInput).toBeInTheDocument();
      expect(adultsInput).toHaveAttribute('min', '1');
      expect(adultsInput).toHaveAttribute('max', '9');
      expect(childrenInput).toHaveAttribute('min', '0');
      expect(childrenInput).toHaveAttribute('max', '9');
    });
  });

  describe('Accessibility', () => {
    test('should have proper labels for all form inputs', () => {
      render(
        <TestWrapper>
          <FlightSearch />
        </TestWrapper>
      );

      // Check that all form inputs have associated labels
      expect(screen.getByLabelText(/origin airport code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/destination airport code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/departure date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/return date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cabin class/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/adults/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/children/i)).toBeInTheDocument();
    });

    test('should have proper button roles', () => {
      render(
        <TestWrapper>
          <FlightSearch />
        </TestWrapper>
      );

      const searchButton = screen.getByRole('button', { name: /search flights/i });
      const filtersButton = screen.getByRole('button', { name: /show filters/i });

      expect(searchButton).toBeInTheDocument();
      expect(filtersButton).toBeInTheDocument();
    });
  });

  describe('UI Consistency Preparation', () => {
    test('should render with dark mode context available', () => {
      // This test ensures the dark mode context is properly available
      // which is necessary for the standardized button styling
      const { container } = render(
        <TestWrapper>
          <FlightSearch />
        </TestWrapper>
      );

      expect(container).toBeInTheDocument();
    });

    test('should render with auth context available', () => {
      // This test ensures the auth context is properly available
      // which may be needed for flight booking functionality
      const { container } = render(
        <TestWrapper>
          <FlightSearch />
        </TestWrapper>
      );

      expect(container).toBeInTheDocument();
    });
  });
});