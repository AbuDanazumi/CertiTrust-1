import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ForgotPasswordPage,
  InstitutionCertificates,
  InstitutionDashboard,
  InstitutionSettings,
  OrganizationAnalytics,
  OrganizationDashboard,
  OrganizationHistory,
  OrganizationSettings,
  OrganizationVerify,
  ResetPasswordPage,
  SuperAdminAudit,
  SuperAdminCertificates,
  SuperAdminDashboard,
  SuperAdminInstitutions,
  SuperAdminOrganizations,
  SuperAdminSettings,
  SuperAdminVerifications,
  UnauthorizedPage,
  VerifyPortal,
} from "@/components/certificate-verification-system";
import { Landing } from "@/components/public/LandingPage";
import { AuthPortalRedirect } from "@/components/public/AuthPortalRedirect";
import InstitutionLogin from "./pages/InstitutionLogin.tsx";
import OrganizationLogin from "./pages/OrganizationLogin.tsx";
import InstitutionSignup from "./pages/InstitutionSignup.tsx";
import OrganizationSignup from "./pages/OrganizationSignup.tsx";
import SuperAdminLogin from "./pages/SuperAdminLogin.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/verify" element={<VerifyPortal />} />

          <Route path="/login" element={<AuthPortalRedirect kind="login" />} />
          <Route path="/login/institution" element={<InstitutionLogin />} />
          <Route path="/login/organization" element={<OrganizationLogin />} />

          <Route path="/signup" element={<AuthPortalRedirect kind="signup" />} />
          <Route path="/signup/institution" element={<InstitutionSignup />} />
          <Route path="/signup/organization" element={<OrganizationSignup />} />

          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route path="/institution" element={<InstitutionDashboard />} />
          <Route path="/institution/certificates" element={<InstitutionCertificates />} />
          <Route path="/institution/settings" element={<InstitutionSettings />} />

          <Route path="/organization" element={<OrganizationDashboard />} />
          <Route path="/organization/verify" element={<OrganizationVerify />} />
          <Route path="/organization/history" element={<OrganizationHistory />} />
          <Route path="/organization/analytics" element={<OrganizationAnalytics />} />
          <Route path="/organization/settings" element={<OrganizationSettings />} />

          <Route path="/super-admin/login" element={<SuperAdminLogin />} />
          <Route path="/superadmin/login" element={<Navigate to="/super-admin/login" replace />} />
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/institutions" element={<SuperAdminInstitutions />} />
          <Route path="/super-admin/organizations" element={<SuperAdminOrganizations />} />
          <Route path="/super-admin/certificates" element={<SuperAdminCertificates />} />
          <Route path="/super-admin/verifications" element={<SuperAdminVerifications />} />
          <Route path="/super-admin/audit" element={<SuperAdminAudit />} />
          <Route path="/super-admin/settings" element={<SuperAdminSettings />} />

          <Route path="/admin" element={<Navigate to="/institution" replace />} />
          <Route path="/admin/login" element={<Navigate to="/login/institution" replace />} />
          <Route path="/admin/certificates" element={<Navigate to="/institution/certificates" replace />} />
          <Route path="/admin/settings" element={<Navigate to="/institution/settings" replace />} />

          <Route path="/auth/login" element={<Navigate to="/login/institution" replace />} />
          <Route path="/auth/signup" element={<Navigate to="/signup/institution" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
