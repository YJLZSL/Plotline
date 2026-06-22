import { AppProviders } from './app/AppProviders';
import { AppRoutes } from './app/AppRoutes';

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
