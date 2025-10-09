import { useEffect, useState } from 'react';
// pages/_app.tsx
import { AuthProvider } from '../contexts/AuthContext';
import { TripProvider } from '@/contexts/TripContext'; // Updated to use the alias defined in tsconfig.json
import { DarkModeProvider } from '../contexts/DarkModeContext';
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { useRouter } from 'next/router';

// Client-side only wrapper to prevent SSR issues
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}

// If you want to redirect with itinerary data, handle it in the page/component that receives the API response.
function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  useEffect(() => {
    // Redirect to home after login/signup, then to plantrip
    const handleRouteChange = (url: string) => {
      if (url === '/home') {
        setTimeout(() => {
          router.push('/home');
        }, 1000);
      }
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);
  
  return (
    <ClientOnly>
      <DarkModeProvider>
        <AuthProvider>
          <TripProvider>
            <Component {...pageProps} />
          </TripProvider>
        </AuthProvider>
      </DarkModeProvider>
    </ClientOnly>
  );
}

export default MyApp;