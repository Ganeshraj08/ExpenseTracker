import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";
import { Routines } from "./pages/Routines";
import { Vault } from "./pages/Vault";
import { AuthProvider } from "./context/AuthContext";
import { ExpenseProvider } from "./context/ExpenseContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CategoryProvider } from "./context/CategoryContext";
import { ToastProvider } from "./context/ToastContext";
import { ModalProvider } from "./context/ModalContext";
import { RecurringExpenseProvider } from "./context/RecurringExpenseContext";
import { UserPreferencesProvider } from "./context/UserPreferencesContext";

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ModalProvider>
          <AuthProvider>
          <UserPreferencesProvider>
        <CategoryProvider>
          <ExpenseProvider>
            <RecurringExpenseProvider>
              <BrowserRouter>
                <Routes>
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/routines" element={<Routines />} />
                  <Route path="/vault" element={<Vault />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                </Routes>
              </BrowserRouter>
            </RecurringExpenseProvider>
          </ExpenseProvider>
        </CategoryProvider>
        </UserPreferencesProvider>
      </AuthProvider>
      </ModalProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
