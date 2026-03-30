import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/theme-context";

import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import PatientPage from "@/pages/patient";
import DonorPage from "@/pages/donor";
import Dashboard from "@/pages/dashboard";
import AiChat from "@/pages/ai-chat";
import MapPage from "@/pages/map";
import ProfilePage from "@/pages/profile";
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

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/patient" component={PatientPage} />
        <Route path="/donor" component={DonorPage} />
        <Route path="/map" component={MapPage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/ai" component={AiChat} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
