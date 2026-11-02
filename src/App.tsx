import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useRole } from "@/context/role-context";
import { AuthPage } from "@/components/auth/auth-page";
import { OnboardingPage } from "@/components/auth/onboarding-page";
import { isOnboardingComplete } from "@/lib/onboarding-logic";
import { canAccess } from "@/lib/permissions";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

// Data providers (mounted only for authenticated users, keyed by user id so
// all cached data is discarded when the signed-in user changes)
import { EventsProvider } from "./context/events-context.tsx";
import { TasksProvider } from "./context/tasks-context.tsx";
import { FinanceProvider } from "./context/finance-context.tsx";
import { MembersProvider } from "./context/members-context.tsx";
import { SponsorsProvider } from "./context/sponsors-context.tsx";

import { ProfilePage } from "@/components/profile/profile-page";

/**
 * Helper function to handle both named and default exports safely
 * This prevents the "Component is not defined" errors during lazy loading.
 */
const lazyLoad = (importFn: () => Promise<any>, name?: string) => {
  return React.lazy(() =>
    importFn().then((module) => {
      if (name && module[name]) return { default: module[name] };
      if (module.default) return { default: module.default };
      const firstExport = Object.values(module).find((val) => typeof val === "function");
      if (firstExport) return { default: firstExport as React.ComponentType<any> };
      throw new Error(`Could not find component in module`);
    })
  );
};

// Lazy Pages using the helper
const DashboardPage = lazyLoad(() => import("@/components/dashboard/dashboard-page"), "DashboardPage");
const EventsPage = lazyLoad(() => import("@/components/events/events-page"), "EventsPage");
const TasksPage = lazyLoad(() => import("@/components/tasks/tasks-page"), "TasksPage");
const MembersPage = lazyLoad(() => import("@/components/members/members-page"), "MembersPage");
const FinancePage = lazyLoad(() => import("@/components/finance/finance-page"), "FinancePage");
const ExternalPage = lazyLoad(() => import("@/components/external/external-page"), "ExternalPage");
const ContactsPage = lazyLoad(() => import("@/components/contacts/contacts-page"), "ContactsPage");
const MarketingPage = lazyLoad(() => import("@/components/marketing/marketing-page"), "MarketingPage");
const DocumentsPage = lazyLoad(() => import("@/components/documents/documents-page"), "DocumentsPage");
const ReportsPage = lazyLoad(() => import("@/components/reports/reports-page"), "ReportsPage");
const SettingsPage = lazyLoad(() => import("@/components/settings/settings-page"), "SettingsPage");

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full w-full py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

/**
 * Route-level authorization guard. Redirects to the dashboard when the current
 * role is not allowed to open the route (see src/lib/permissions.ts).
 * NOTE: this is UX only; data access is enforced by Supabase RLS.
 */
function RequireRole({ route, children }: { route?: string; children: React.ReactNode }) {
  const { role } = useRole();
  const location = useLocation();
  const target = route ?? location.pathname;
  if (!canAccess(role, target)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/**
 * Main Layout wrapper providing Sidebar and Topbar
 */
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <TopBar />
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <Suspense fallback={<PageLoader />}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

const guarded = (route: string, element: React.ReactNode) => (
  <RequireRole route={route}>{element}</RequireRole>
);

function App() {
  const { user, profile, loading, profileLoading } = useAuth();
  const onboardingComplete = isOnboardingComplete(profile);

  // 1. Handle Initial Bootup Loading
  if (loading || (user && profileLoading)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#09090b] text-white">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-40">System Initializing</p>
      </div>
    );
  }

  // 2. Handle Authentication
  if (!user) {
    return <AuthPage />;
  }

  if (!onboardingComplete) {
    return <OnboardingPage />;
  }

  // 3. Authenticated Application
  return (
    <MembersProvider key={user.id}>
      <SponsorsProvider>
        <EventsProvider>
          <TasksProvider>
            <FinanceProvider>
              <Layout>
                <Routes>
                  {/* Role-appropriate dashboard (DashboardPage switches on role) */}
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />

                  <Route path="/members" element={guarded("/members", <MembersPage />)} />
                  <Route path="/tasks" element={guarded("/tasks", <TasksPage />)} />
                  <Route path="/events" element={guarded("/events", <EventsPage />)} />
                  <Route path="/finance" element={guarded("/finance", <FinancePage />)} />
                  <Route path="/external" element={guarded("/external", <ExternalPage />)} />
                  <Route path="/contacts" element={guarded("/contacts", <ContactsPage />)} />
                  <Route path="/marketing" element={guarded("/marketing", <MarketingPage />)} />
                  <Route path="/documents" element={guarded("/documents", <DocumentsPage />)} />
                  <Route path="/reports" element={guarded("/reports", <ReportsPage />)} />
                  <Route path="/settings" element={guarded("/settings", <SettingsPage />)} />
                  <Route path="/profile" element={guarded("/profile", <ProfilePage />)} />

                  {/* Fallback for unknown routes */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </FinanceProvider>
          </TasksProvider>
        </EventsProvider>
      </SponsorsProvider>
    </MembersProvider>
  );
}

export default App;
