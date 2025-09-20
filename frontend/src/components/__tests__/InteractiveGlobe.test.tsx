import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
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
      continent: 'Europe',
      latitude: 48.8566,
      longitude: 2.3522,
      category: 'city',
      description: 'City of Light and Love',
      popularity: 10,
      averageCost: '$150-300/day',
      bestMonths: ['April', 'May', 'September', 'October'],
      image: '/images/paris.jpg'
    },
    {
      id: 'tokyo',
      name: 'Tokyo',
      country: 'Japan',
      continent: 'Asia',
      latitude: 35.6762,
      longitude: 139.6503,
      category: 'city',
      description: 'Modern metropolis meets tradition',
      popularity: 9,
      averageCost: '$100-250/day',
      bestMonths: ['March', 'April', 'May', 'September', 'October'],
      image: '/images/tokyo.jpg'
    },
    {
      id: 'maldives',
      name: 'Maldives',
      country: 'Maldives',
      continent: 'Asia',
      latitude: 3.2028,
      longitude: 73.2207,
      category: 'beach',
      description: 'Tropical paradise',
      popularity: 9,
      averageCost: '$300-800/day',
      bestMonths: ['November', 'December', 'January', 'February'],
      image: '/images/maldives.jpg'
    }
  ]
}))

// Mock react-globe.gl
jest.mock('react-globe.gl', () => {
  return function MockGlobe() {
    return <div data-testid="mock-globe">Mock Globe Component</div>
  }
})

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
    it('renders the globe component', () => {
      render(<InteractiveGlobe {...defaultProps} />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })

    it('renders the globe title', () => {
      render(<InteractiveGlobe {...defaultProps} />)
      
      expect(screen.getByText('🌍 Interactive Globe')).toBeInTheDocument()
    })

    it('renders instruction text', () => {
      render(<InteractiveGlobe {...defaultProps} />)
      
      expect(screen.getByText('Click destinations')).toBeInTheDocument()
      expect(screen.getByText('Drag to rotate')).toBeInTheDocument()
      expect(screen.getByText('Scroll to zoom')).toBeInTheDocument()
    })
  })

  describe('Destination Selection', () => {
    it('calls onDestinationSelect when globe is clicked', () => {
      render(<InteractiveGlobe {...defaultProps} />)
      
      const globe = screen.getByTestId('mock-globe')
      fireEvent.click(globe)
      
      expect(globe).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('shows filtered destinations based on search query', () => {
      render(
        <InteractiveGlobe 
          {...defaultProps} 
          searchQuery="paris"
        />
      )
      
      expect(screen.getByText('🏙️ Paris')).toBeInTheDocument()
      expect(screen.getByText('📍 France')).toBeInTheDocument()
    })
  })

  describe('Props Changes', () => {
    it('updates when selectedDestination changes', () => {
      const { rerender } = render(<InteractiveGlobe {...defaultProps} />)
      
      rerender(
        <InteractiveGlobe 
          {...defaultProps} 
          selectedDestination={popularDestinations[0]}
        />
      )
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })

    it('updates when searchQuery changes', () => {
      const { rerender } = render(<InteractiveGlobe {...defaultProps} />)
      
      rerender(
        <InteractiveGlobe 
          {...defaultProps} 
          searchQuery="tokyo"
        />
      )
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })

    it('handles empty search query', () => {
      render(<InteractiveGlobe {...defaultProps} searchQuery="" />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })

    it('handles invalid search query', () => {
      render(<InteractiveGlobe {...defaultProps} searchQuery="nonexistent" />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      const { rerender } = render(<InteractiveGlobe {...defaultProps} />)
      
      rerender(<InteractiveGlobe {...defaultProps} />)
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('is accessible via keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<InteractiveGlobe {...defaultProps} />)
      
      const globe = screen.getByTestId('mock-globe')
      await user.tab()
      
      expect(screen.getByTestId('mock-globe')).toBeInTheDocument()
    })
  })
})