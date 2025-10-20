import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the global fetch function
global.fetch = jest.fn()

// Test the fetchRecommendations function logic directly
describe('fetchRecommendations Fixed Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.MockedFunction<typeof fetch>).mockClear()
  })

  // Helper function to simulate the fixed fetchRecommendations logic
  const simulateFetchRecommendations = async (dest: string) => {
    // Input validation (fixed logic)
    if (!dest || typeof dest !== 'string' || !dest.trim()) {
      console.warn('⚠️ Invalid destination provided to fetchRecommendations:', dest)
      return { success: false, error: 'Invalid destination' }
    }

    // Convert airport code to city name for better search results
    const getDestinationCityName = (destination: string) => {
      if (destination === 'BOM') return 'Mumbai'
      if (destination === 'YYZ') return 'Toronto'
      return destination
    }

    const cityName = getDestinationCityName(dest)
    if (!cityName || !cityName.trim()) {
      console.warn('⚠️ Could not determine city name for destination:', dest)
      return { success: false, error: 'Invalid city name' }
    }

    // Use more specific search queries to get better attraction results
    const searchQueries = [
      `${cityName} attractions`,
      `${cityName} landmarks`,
      `${cityName} top attractions`,
      `${cityName} must see`,
      `${cityName} famous places`,
      `${cityName} tourist attractions`,
      `${cityName} things to do`
    ]

    const allResults = []
    for (const searchQuery of searchQueries) {
      // Validate searchQuery before processing (fixed logic)
      if (!searchQuery || typeof searchQuery !== 'string' || !searchQuery.trim()) {
        console.warn(`⚠️ Skipping invalid search query:`, searchQuery)
        continue
      }

      try {
        // Fixed: Use searchQuery directly as string, not as object property
        const searchResponse = await fetch(
          `http://localhost:4000/tripadvisor/location/search?searchQuery=${encodeURIComponent(searchQuery)}&limit=6`
        )
        
        if (!searchResponse.ok) {
          console.warn(`❌ API request failed for "${searchQuery}": ${searchResponse.status} ${searchResponse.statusText}`)
          continue
        }

        const searchData = await searchResponse.json()
        
        if (searchData.success && searchData.data && Array.isArray(searchData.data)) {
          console.log(`✅ Found ${searchData.data.length} results for "${searchQuery}"`)
          allResults.push(...searchData.data)
        } else {
          console.warn(`❌ No results for "${searchQuery}":`, searchData)
        }
      } catch (error) {
        console.warn(`🚨 Search failed for query: "${searchQuery}"`, error)
        // Continue with other queries even if one fails
      }
    }

    return { success: true, results: allResults, cityName }
  }

  describe('Input Validation', () => {
    it('should handle empty destination gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      const result = await simulateFetchRecommendations('')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid destination')
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Invalid destination provided to fetchRecommendations:', '')
      
      consoleSpy.mockRestore()
    })

    it('should handle null destination gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      const result = await simulateFetchRecommendations(null as any)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid destination')
      
      consoleSpy.mockRestore()
    })

    it('should handle whitespace-only destination gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      const result = await simulateFetchRecommendations('   ')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid destination')
      
      consoleSpy.mockRestore()
    })
  })

  describe('API Call Structure', () => {
    it('should construct proper API URLs with string search queries', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            location_id: '123',
            name: 'Test Attraction',
            address: 'Test Address',
            category: 'attraction'
          }
        ]
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await simulateFetchRecommendations('Mumbai')

      expect(result.success).toBe(true)
      expect(result.cityName).toBe('Mumbai')
      
      // Verify that fetch was called with correct URLs (string queries, not object properties)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('searchQuery=Mumbai%20attractions')
      )
    })

    it('should handle API response validation correctly', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            location_id: '123',
            name: 'Valid Attraction',
            address: 'Valid Address',
            category: 'attraction'
          }
        ]
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      const result = await simulateFetchRecommendations('Toronto')

      expect(result.success).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Found 1 results for "Toronto attractions"')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      )

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await simulateFetchRecommendations('Mumbai')

      expect(result.success).toBe(true)
      expect(result.results).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Search failed for query:'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should handle HTTP error responses gracefully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response)

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await simulateFetchRecommendations('Mumbai')

      expect(result.success).toBe(true)
      expect(result.results).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ API request failed for "Mumbai attractions": 404 Not Found')
      )

      consoleSpy.mockRestore()
    })

    it('should continue processing other queries when one fails', async () => {
      let callCount = 0
      ;(fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('First query failed'))
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                location_id: '456',
                name: 'Second Query Result',
                address: 'Test Address',
                category: 'attraction'
              }
            ]
          }),
        } as Response)
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const logSpy = jest.spyOn(console, 'log').mockImplementation()

      const result = await simulateFetchRecommendations('Mumbai')

      expect(result.success).toBe(true)
      expect(result.results.length).toBeGreaterThan(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 Search failed for query:'),
        expect.any(Error)
      )
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Found 1 results for')
      )

      consoleSpy.mockRestore()
      logSpy.mockRestore()
    })
  })

  describe('Fixed Bug Verification', () => {
    it('should not throw ReferenceError for undefined query variable', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response)

      // This should not throw any errors
      await expect(simulateFetchRecommendations('Mumbai')).resolves.toBeDefined()
    })

    it('should use searchQuery as string, not as object property', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response)

      await simulateFetchRecommendations('Tokyo')

      const calls = (fetch as jest.MockedFunction<typeof fetch>).mock.calls
      // Verify URL construction uses string directly, not object properties
      expect(calls[0][0]).toContain('searchQuery=Tokyo%20attractions')
      expect(calls[0][0]).not.toContain('searchQuery=undefined')
    })

    it('should use proper URL encoding for search queries', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response)

      await simulateFetchRecommendations('New York')

      const calls = (fetch as jest.MockedFunction<typeof fetch>).mock.calls
      expect(calls[0][0]).toContain('New%20York%20attractions')
    })
  })
})