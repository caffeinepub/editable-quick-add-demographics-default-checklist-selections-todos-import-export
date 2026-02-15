import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import CaseListPage from './pages/CaseListPage';
import NewCasePage from './pages/NewCasePage';
import CaseDetailPage from './pages/CaseDetailPage';
import AppLayout from './components/layout/AppLayout';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

function RootComponent() {
  const { identity, isInitializing } = useInternetIdentity();
  
  const isAuthenticated = !!identity;

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center max-w-md px-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              VetCase Tracker
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your veterinary surgery cases with ease
            </p>
          </div>
          <div className="bg-card border rounded-lg p-8 shadow-lg">
            <p className="text-foreground mb-6">
              Please log in to access your surgery case records
            </p>
            <LoginButtonInline />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CaseListPage,
});

const newCaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cases/new',
  component: NewCasePage,
});

const caseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cases/$caseId',
  component: CaseDetailPage,
});

const routeTree = rootRoute.addChildren([indexRoute, newCaseRoute, caseDetailRoute]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function LoginButtonInline() {
  const { login, loginStatus } = useInternetIdentity();
  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <Button
      onClick={login}
      disabled={isLoggingIn}
      size="lg"
    >
      {isLoggingIn ? (
        'Logging in...'
      ) : (
        <>
          <LogIn className="mr-2 h-5 w-5" />
          Login
        </>
      )}
    </Button>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}
