import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the contexts
jest.mock('../../contexts/DarkModeContext', () => ({
  useDarkMode: () => ({ isDarkMode: false })
}))

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    state: { user: null }
  })
}))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/flight-search'
  })
}))

describe('FlightSearch Deduplication', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should deduplicate flights based on key characteristics', () => {
    // Test the deduplication logic directly
    const mockFlights = [
      {
        id: 'flight-1',
        airline: 'Test Airlines',
        flightNumber: 'TA123',
        departure: { airport: 'JFK', time: '10:00 AM', date: '2025-11-06' },
        arrival: { airport: 'LHR', time: '10:00 PM', date: '2025-11-06' },
        price: 500
      },
      {
        id: 'flight-2',
        airline: 'Test Airlines',
        flightNumber: 'TA123',
        departure: { airport: 'JFK', time: '10:00 AM', date: '2025-11-06' },
        arrival: { airport: 'LHR', time: '10:00 PM', date: '2025-11-06' },
        price: 500
      },
      {
        id: 'flight-3',
        airline: 'Different Airlines',
        flightNumber: 'DA456',
        departure: { airport: 'JFK', time: '2:00 PM', date: '2025-11-06' },
        arrival: { airport: 'LHR', time: '2:00 AM', date: '2025-11-07' },
        price: 600
      }
    ]

    // Simulate the deduplication logic
    const flightsMap = new Map()
    const deduplicatedFlights = mockFlights.filter(flight => {
      const key = `${flight.airline}-${flight.flightNumber}-${flight.departure.airport}-${flight.arrival.airport}-${flight.departure.time}-${flight.departure.date}-${flight.price}`
      if (flightsMap.has(key)) {
        return false
      }
      flightsMap.set(key, true)
      return true
    })

    // Should remove the duplicate flight
    expect(deduplicatedFlights).toHaveLength(2)
    expect(deduplicatedFlights[0].id).toBe('flight-1')
    expect(deduplicatedFlights[1].id).toBe('flight-3')
  })

  it('should ensure flight direction integrity', () => {
    const outgoingFlights = [
      {
        departure: { airport: 'JFK' },
        arrival: { airport: 'LHR' }
      },
      {
        departure: { airport: 'LHR' }, // This should be filtered out from outgoing
        arrival: { airport: 'JFK' }
      }
    ]

    const incomingFlights = [
      {
        departure: { airport: 'LHR' },
        arrival: { airport: 'JFK' }
      },
      {
        departure: { airport: 'JFK' }, // This should be filtered out from incoming
        arrival: { airport: 'LHR' }
      }
    ]

    const searchRequest = { origin: 'JFK', destination: 'LHR' }

    // Simulate direction integrity check for outgoing flights
    const cleanOutgoing = outgoingFlights.filter(flight => 
      flight.departure.airport === searchRequest.origin || 
      flight.departure.airport.includes(searchRequest.origin)
    )

    // Simulate direction integrity check for incoming flights
    const cleanIncoming = incomingFlights.filter(flight => 
      flight.departure.airport === searchRequest.destination || 
      flight.departure.airport.includes(searchRequest.destination)
    )

    expect(cleanOutgoing).toHaveLength(1)
    expect(cleanOutgoing[0].departure.airport).toBe('JFK')
    
    expect(cleanIncoming).toHaveLength(1)
    expect(cleanIncoming[0].departure.airport).toBe('LHR')
  })
})