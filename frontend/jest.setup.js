import '@testing-library/jest-dom'

// Mock react-globe.gl to avoid Three.js issues in tests
jest.mock('react-globe.gl', () => {
  return function MockGlobe(props) {
    return (
      <button 
        data-testid="mock-globe"
        onClick={() => props.onPointClick && props.onPointClick({ id: 'test', name: 'Test Location' })}
        onKeyDown={(e) => e.key === 'Enter' && props.onPointClick && props.onPointClick({ id: 'test', name: 'Test Location' })}
        type="button"
      >
        Mock Globe
      </button>
    )
  }
})

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}