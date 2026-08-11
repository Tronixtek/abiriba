import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { RequireAuth, RequireRole } from "@/lib/auth/RequireRole";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { CheckoutPage } from "@/pages/pos/CheckoutPage";
import { ProductsPage } from "@/pages/inventory/ProductsPage";
import { LowStockPage } from "@/pages/inventory/LowStockPage";
import { CustomersPage } from "@/pages/customers/CustomersPage";
import { OrdersPage } from "@/pages/orders/OrdersPage";
import { AuditLogPage } from "@/pages/audit/AuditLogPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { StaffPage } from "@/pages/staff/StaffPage";
import { StoreQrPage } from "@/pages/settings/StoreQrPage";
import { StorefrontPage } from "@/pages/storefront/StorefrontPage";
import { LandingPage } from "@/pages/marketing/LandingPage";
import { TermsPage } from "@/pages/marketing/TermsPage";
import { PrivacyPage } from "@/pages/marketing/PrivacyPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/store/:tenantId" element={<StorefrontPage />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<CheckoutPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route
              path="low-stock"
              element={
                <RequireRole roles={["OWNER", "MANAGER"]}>
                  <LowStockPage />
                </RequireRole>
              }
            />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route
              path="audit-log"
              element={
                <RequireRole roles={["OWNER", "MANAGER"]}>
                  <AuditLogPage />
                </RequireRole>
              }
            />
            <Route
              path="reports"
              element={
                <RequireRole roles={["OWNER", "MANAGER"]}>
                  <ReportsPage />
                </RequireRole>
              }
            />
            <Route
              path="staff"
              element={
                <RequireRole roles={["OWNER", "MANAGER"]}>
                  <StaffPage />
                </RequireRole>
              }
            />
            <Route
              path="store-qr"
              element={
                <RequireRole roles={["OWNER", "MANAGER"]}>
                  <StoreQrPage />
                </RequireRole>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
