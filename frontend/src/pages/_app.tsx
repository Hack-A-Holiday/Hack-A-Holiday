// pages/_app.tsx
import { AuthProvider } from '../contexts/AuthContext';
import { TripProvider } from '@/contexts/TripContext'; // Updated to use the alias defined in tsconfig.json
import ChatPopup from '../components/ChatPopup';
import type { AppProps } from 'next/app';
import '../styles/globals.css';

// If you want to redirect with itinerary data, handle it in the page/component that receives the API response.
function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <TripProvider>
        <Component {...pageProps} />
        <ChatPopup />
      </TripProvider>
    </AuthProvider>
  );
}

export default MyApp;