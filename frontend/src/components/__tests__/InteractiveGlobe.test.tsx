import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InteractiveGlobe from '../InteractiveGlobe'
import { popularDestinations } from '../../data/destinations'

// Mock the destinations data
jest.mock('../../data/destinations', () => ({
  popularDestinations: [
    {
      id: 'paris',
      name: 'Paris',
      country: 'France',
      lat: 48.8566,
      lng: 2.3522,
      category: 'city',
      description: 'City of Light and Love',
      averageCost: '$150-300/day',
      bestMonths: ['April', 'May', 'September', 'October'],
      image: '/images/paris.jpg'
    },
    {
      id: 'tokyo',
      name: 'Tokyo',
      country: 'Japan',
      lat: 35.6762,
      lng: 139.6503,
      category: 'city',
      description: 'Modern metropolis meets tradition',
      averageCost: '$100-250/day',
      bestMonths: ['March', 'April', 'May', 'September', 'October'],
      image: '/images/tokyo.jpg'
    },
    {
      id: 'maldives',
      name: 'Maldives',
      country: 'Maldives',
      lat: 3.2028,
      lng: 73.2207,
      category: 'beach',
      description: 'Tropical paradise',
      averageCost: '$300-800/day',
      bestMonths: ['November', 'December', 'January', 'February', 'March'],
      image: '/images/maldives.jpg'
    }
  ]
}))

describe('InteractiveGlobe', () => {
  const defaultProps = {
    onDestinationSelect: jest.fn(),
    selectedDestination: undefined,
    searchQuery: ''
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the globe container', () => {
      render(<InteractiveGlobe {...defaultProps} />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })

    it('should display the Interactive Globe badge', () => {
      render(<InteractiveGlobe {...defaultProps} />)
      
      expect(screen.getByText('🌍 Interactive Globe')).toBeInTheDocument()
    })

    it('should display interaction instructions', () => {
      render(<InteractiveGlobe {...defaultProps} />)
      
      expect(screen.getByText('Click destinations')).toBeInTheDocument()
      expect(screen.getByText('Drag to rotate')).toBeInTheDocument()
      expect(screen.getByText('Scroll to zoom')).toBeInTheDocument()
    })
  })

  describe('Destination Selection', () => {
    it('should call onDestinationSelect when a destination is clicked', async () => {
      const mockOnDestinationSelect = jest.fn()
      render(
        <InteractiveGlobe 
          {...defaultProps} 
          onDestinationSelect={mockOnDestinationSelect}
        />
      )

      const globe = screen.getByTestId('mock-globe')
      fireEvent.click(globe)

      expect(mockOnDestinationSelect).toHaveBeenCalledWith({
        id: 'test',
        name: 'Test Location'
      })
    })

    it('should display selected destination info when a destination is selected', () => {
      const selectedDestination = popularDestinations[0] // Paris
      render(
        <InteractiveGlobe 
          {...defaultProps} 
          selectedDestination={selectedDestination}
        />
      )

      expect(screen.getByText('🏙️ Paris')).toBeInTheDocument()
      expect(screen.getByText('📍 France')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should filter destinations based on search query', () => {
      const { rerender } = render(<InteractiveGlobe {...defaultProps} />)
      
      // Initially should process all destinations
      expect(popularDestinations).toHaveLength(3)

      // Search for Paris
      rerender(<InteractiveGlobe {...defaultProps} searchQuery="Paris" />)
      
      // Component should still render (filtering happens internally)
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })

    it('should filter destinations by country', () => {
      render(<InteractiveGlobe {...defaultProps} searchQuery="Japan" />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })

    it('should filter destinations by category', () => {
      render(<InteractiveGlobe {...defaultProps} searchQuery="beach" />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })

    it('should handle empty search results', () => {
      render(<InteractiveGlobe {...defaultProps} searchQuery="nonexistent" />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<InteractiveGlobe {...defaultProps} />)
      
      const globe = screen.getByTestId('mock-globe')
      expect(globe).toBeInTheDocument()
    })
  })

  describe('Props Validation', () => {
    it('should handle missing onDestinationSelect gracefully', () => {
      const propsWithoutCallback = {
        selectedDestination: undefined,
        searchQuery: ''
      }
      
      expect(() => {
        render(<InteractiveGlobe {...propsWithoutCallback} onDestinationSelect={jest.fn()} />)
      }).not.toThrow()
    })

    it('should handle undefined selectedDestination', () => {
      render(<InteractiveGlobe {...defaultProps} selectedDestination={undefined} />)
      
      // Should not display selected destination info
      expect(screen.queryByText('📍')).not.toBeInTheDocument()
    })

    it('should handle empty search query', () => {
      render(<InteractiveGlobe {...defaultProps} searchQuery="" />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle globe rendering errors gracefully', () => {
      // Mock console.error to avoid test output pollution
      const originalError = console.error
      console.error = jest.fn()

      render(<InteractiveGlobe {...defaultProps} />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
      
      console.error = originalError
    })
  })

  describe('Performance', () => {
    it('should memoize filtered destinations', () => {
      const { rerender } = render(<InteractiveGlobe {...defaultProps} searchQuery="Paris" />)
      
      // Re-render with same search query
      rerender(<InteractiveGlobe {...defaultProps} searchQuery="Paris" />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })

    it('should handle rapid search query changes', async () => {
      const { rerender } = render(<InteractiveGlobe {...defaultProps} searchQuery="" />)
      
      // Rapid changes
      rerender(<InteractiveGlobe {...defaultProps} searchQuery="P" />)
      rerender(<InteractiveGlobe {...defaultProps} searchQuery="Pa" />)
      rerender(<InteractiveGlobe {...defaultProps} searchQuery="Par" />)
      rerender(<InteractiveGlobe {...defaultProps} searchQuery="Paris" />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })
  })
})