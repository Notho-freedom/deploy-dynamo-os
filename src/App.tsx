import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import DashboardLayout from "./pages/DashboardLayout.tsx";
import Dashboard from "./pages/dashboard/Dashboard.tsx";
import Builder from "./pages/dashboard/Builder.tsx";
import UIGen from "./pages/dashboard/UIGen.tsx";
import Backend from "./pages/dashboard/Backend.tsx";
import Deploy from "./pages/dashboard/Deploy.tsx";
import Domains from "./pages/dashboard/Domains.tsx";
import EmailSetup from "./pages/dashboard/EmailSetup.tsx";
import CICD from "./pages/dashboard/CICD.tsx";
import Monitoring from "./pages/dashboard/Monitoring.tsx";
import Billing from "./pages/dashboard/Billing.tsx";
import Settings from "./pages/dashboard/Settings.tsx";
import VercelCallback from "./pages/integrations/VercelCallback.tsx";
import GithubCallback from "./pages/integrations/GithubCallback.tsx";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/integrations/vercel/callback" element={<VercelCallback />} />
              <Route path="/integrations/github/callback" element={<GithubCallback />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="builder" element={<Builder />} />
                <Route path="ui" element={<UIGen />} />
                <Route path="backend" element={<Backend />} />
                <Route path="deploy" element={<Deploy />} />
                <Route path="domains" element={<Domains />} />
                <Route path="email" element={<EmailSetup />} />
                <Route path="cicd" element={<CICD />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="billing" element={<Billing />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
