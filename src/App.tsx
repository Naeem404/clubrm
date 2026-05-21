import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { AuthPage } from "@/components/auth/auth-page";
import { OnboardingPage } from "@/components/auth/onboarding-page";
import { isOnboardingComplete } from "@/lib/onboarding-logic";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ErrorBoundary } from "@/components/error-boundary";

// Context Providers
import { OrgProvider } from './context/org-context.tsx'
import { EventsProvider } from './context/events-context.tsx'
import { TasksProvider } from './context/tasks-context.tsx'
import { FinanceProvider } from './context/finance-context.tsx'
import { MembersProvider } from './context/members-context.tsx'
import { SponsorsProvider } from './context/sponsors-context.tsx'

// Variants
import { PresidentDashboard } from "@/components/dashboard/variants/president-dashboard";
import { ProfilePage } from "@/components/profile/profile-page";

// Public-only routes (no auth required)
import { PublicEventRSVPPage } from "@/components/public/public-event-rsvp";
import { InviteAcceptPage } from "@/components/public/invite-accept";

/**
 * Helper function to handle both named and default exports safely
 * This prevents the "Component is not defined" errors during lazy loading.
 */
const lazyLoad = (importFn: () => Promise<any>, name?: string) => {
  return React.lazy(() => 
    importFn().then((module) => {
      if (name && module[name]) return { default: module[name] };
      if (module.default) return { default: module.default };
      const firstExport = Object.values(module).find((val) => typeof val === 'function');
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

/**
 * Wrap a route element with a scoped ErrorBoundary so a failure in one
 * page doesn't take down the chrome (sidebar, topbar, layout).
 */
function Bounded({ scope, children }: { scope: string; children: React.ReactNode }) {
  return <ErrorBoundary scope={scope}>{children}</ErrorBoundary>;
}

function App() {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();
  const onboardingComplete = isOnboardingComplete(profile)

  // Public routes that bypass auth entirely (event RSVP, invite acceptance)
  const isPublicRoute =
    location.pathname.startsWith("/rsvp/") ||
    location.pathname.startsWith("/join/")

  if (isPublicRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/rsvp/:eventId" element={<Bounded scope="Public RSVP"><PublicEventRSVPPage /></Bounded>} />
          <Route path="/join/:inviteToken" element={<Bounded scope="Invite Accept"><InviteAcceptPage /></Bounded>} />
        </Routes>
      </Suspense>
    )
  }

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
  // Feature providers are mounted ONCE here, after auth, so they receive
  // a valid session before issuing any Supabase queries. The `key={user.id}`
  // forces a clean re-mount when a different user signs in.
  return (
    <OrgProvider>
      <MembersProvider key={user.id}>
        <EventsProvider>
          <TasksProvider>
            <FinanceProvider>
              <SponsorsProvider>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Bounded scope="Dashboard"><PresidentDashboard /></Bounded>} />
                    <Route path="/dashboard" element={<Bounded scope="Dashboard"><DashboardPage /></Bounded>} />
                    <Route path="/members" element={<Bounded scope="Members"><MembersPage /></Bounded>} />
                    <Route path="/tasks" element={<Bounded scope="Tasks"><TasksPage /></Bounded>} />
                    <Route path="/events" element={<Bounded scope="Events"><EventsPage /></Bounded>} />
                    <Route path="/finance" element={<Bounded scope="Finance"><FinancePage /></Bounded>} />
                    <Route path="/external" element={<Bounded scope="External"><ExternalPage /></Bounded>} />
                    <Route path="/contacts" element={<Bounded scope="Contacts"><ContactsPage /></Bounded>} />
                    <Route path="/marketing" element={<Bounded scope="Marketing"><MarketingPage /></Bounded>} />
                    <Route path="/documents" element={<Bounded scope="Documents"><DocumentsPage /></Bounded>} />
                    <Route path="/reports" element={<Bounded scope="Reports"><ReportsPage /></Bounded>} />
                    <Route path="/settings" element={<Bounded scope="Settings"><SettingsPage /></Bounded>} />
                    <Route path="/profile" element={<Bounded scope="Profile"><ProfilePage /></Bounded>} />

                    {/* Fallback for unknown routes */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </SponsorsProvider>
            </FinanceProvider>
          </TasksProvider>
        </EventsProvider>
      </MembersProvider>
    </OrgProvider>
  );
}

export default App;