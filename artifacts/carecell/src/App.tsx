import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/theme-context";
import { AuthProvider, useAuth } from "@/context/auth-context";

import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import PatientPage from "@/pages/patient";
import DonorPage from "@/pages/donor";
import Dashboard from "@/pages/dashboard";
import AiChat from "@/pages/ai-chat";
import MapPage from "@/pages/map";
import ProfilePage from "@/pages/profile";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect to={`/login?next=${encodeURIComponent(location)}`} />;
  return <Component />;
}

function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/login" component={() => <AuthRoute component={LoginPage} />} />
        <Route path="/signup" component={() => <AuthRoute component={SignupPage} />} />
        <Route path="/" component={() => <ProtectedRoute component={Home} />} />
        <Route path="/patient" component={() => <ProtectedRoute component={PatientPage} />} />
        <Route path="/donor" component={() => <ProtectedRoute component={DonorPage} />} />
        <Route path="/map" component={() => <ProtectedRoute component={MapPage} />} />
        <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/ai" component={() => <ProtectedRoute component={AiChat} />} />
        <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
