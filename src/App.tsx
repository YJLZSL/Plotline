import { AppProviders } from './app/AppProviders';
import { AppRoutes } from './app/AppRoutes';
import { SplashOverlay } from './components/layout/SplashOverlay';

export default function App() {
  return (
    <AppProviders>
      <SplashOverlay />
      <AppRoutes />
    </AppProviders>
  );
}
