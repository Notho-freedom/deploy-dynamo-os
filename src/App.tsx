import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import BackendNew from "./pages/dashboard/BackendNew.tsx";
import BackendServiceDetail from "./pages/dashboard/BackendServiceDetail.tsx";
import BackendDatabaseDetail from "./pages/dashboard/BackendDatabaseDetail.tsx";
import Deploy from "./pages/dashboard/Deploy.tsx";
import DeployNew from "./pages/dashboard/DeployNew.tsx";
import DeployConfigure from "./pages/dashboard/DeployConfigure.tsx";
import DeployDetail from "./pages/dashboard/DeployDetail.tsx";
import Domains from "./pages/dashboard/Domains.tsx";
import DomainDetail from "./pages/dashboard/DomainDetail.tsx";
import EmailSetup from "./pages/dashboard/EmailSetup.tsx";
import CICD from "./pages/dashboard/CICD.tsx";
import Logs from "./pages/dashboard/Logs.tsx";
import Analytics from "./pages/dashboard/Analytics.tsx";
import Observability from "./pages/dashboard/Observability.tsx";
import Billing from "./pages/dashboard/Billing.tsx";
import Settings from "./pages/dashboard/Settings.tsx";
import VercelCallback from "./pages/integrations/VercelCallback.tsx";
import GithubCallback from "./pages/integrations/GithubCallback.tsx";



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
                <Route path="backend/new" element={<BackendNew />} />
                <Route path="backend/service/:serviceId" element={<BackendServiceDetail />} />
                <Route path="backend/database/:dbId" element={<BackendDatabaseDetail />} />
                <Route path="deploy" element={<Deploy />} />
                <Route path="deploy/new" element={<DeployNew />} />
                <Route path="deploy/new/configure" element={<DeployConfigure />} />
                <Route path="deploy/:projectId" element={<DeployDetail />} />
                <Route path="domains" element={<Domains />} />
                <Route path="domains/:domain" element={<DomainDetail />} />
                <Route path="email" element={<EmailSetup />} />
                <Route path="cicd" element={<CICD />} />
                <Route path="logs" element={<Logs />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="observability" element={<Observability />} />
                <Route path="monitoring" element={<Observability />} />
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
