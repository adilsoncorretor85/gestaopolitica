import '@testing-library/jest-dom'
import { vi, beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import React from 'react'

// Cleanup após cada teste
afterEach(() => {
  cleanup()
})

// Mock do console para evitar logs desnecessários nos testes
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillMount'))
    ) {
      return
    }
    originalConsoleWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Mock do Supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  getSupabaseClient: vi.fn(),
  handleSupabaseError: vi.fn((error: any) => 'Erro mockado'),
}))

// Mock do React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  useParams: () => ({}),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  Routes: ({ children }: { children: React.ReactNode }) => children,
  Route: ({ children }: { children: React.ReactNode }) => children,
  Navigate: () => null,
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
  NavLink: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
}))

// Mock do Google Maps
vi.mock('@/lib/googleMaps', () => ({
  loadGoogleMaps: vi.fn().mockResolvedValue(true),
  geocodeAddress: vi.fn().mockResolvedValue({
    lat: -26.3044,
    lng: -48.8461,
    formatted_address: 'Joinville, SC, Brasil',
  }),
  reverseGeocode: vi.fn().mockResolvedValue({
    formatted_address: 'Joinville, SC, Brasil',
    address_components: [],
  }),
}))

// Mock do Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    form: 'form',
    input: 'input',
    textarea: 'textarea',
    select: 'select',
    option: 'option',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    p: 'p',
    a: 'a',
    img: 'img',
    ul: 'ul',
    li: 'li',
    nav: 'nav',
    header: 'header',
    main: 'main',
    section: 'section',
    article: 'article',
    aside: 'aside',
    footer: 'footer',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  useInView: () => [vi.fn(), false],
}))

// Mock do React Hook Form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn) => fn),
    watch: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(),
    reset: vi.fn(),
    formState: { errors: {}, isSubmitting: false },
    control: {},
  }),
  Controller: ({ render }: any) => render({ field: {}, fieldState: {} }),
}))

// Mock do Zod
vi.mock('zod', () => ({
  z: {
    string: () => ({
      min: vi.fn().mockReturnThis(),
      max: vi.fn().mockReturnThis(),
      email: vi.fn().mockReturnThis(),
      url: vi.fn().mockReturnThis(),
      optional: vi.fn().mockReturnThis(),
      nullable: vi.fn().mockReturnThis(),
      refine: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
    }),
    number: () => ({
      min: vi.fn().mockReturnThis(),
      max: vi.fn().mockReturnThis(),
      optional: vi.fn().mockReturnThis(),
      nullable: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
    }),
    boolean: () => ({
      optional: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
    }),
    object: vi.fn().mockReturnThis(),
    array: vi.fn().mockReturnThis(),
    enum: vi.fn().mockReturnThis(),
    union: vi.fn().mockReturnThis(),
    literal: vi.fn().mockReturnThis(),
  },
}))

// Mock do environment
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    VITE_GOOGLE_MAPS_API_KEY: 'test-maps-key',
    VITE_DEBUG: 'false',
    VITE_VAPID_PUBLIC_KEY: 'test-vapid-key',
    DEV: false,
    PROD: true,
  },
  writable: true,
})

// Mock do window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock do IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock do ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock do Notification API
Object.defineProperty(window, 'Notification', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    close: vi.fn(),
  })),
})

// Mock do Service Worker
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn().mockResolvedValue({
      installing: null,
      waiting: null,
      active: null,
      addEventListener: vi.fn(),
    }),
    getRegistration: vi.fn().mockResolvedValue(null),
    ready: Promise.resolve({
      pushManager: {
        subscribe: vi.fn(),
        getSubscription: vi.fn(),
      },
    }),
  },
})

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock do sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

