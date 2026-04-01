import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";
import { Routines } from "./pages/Routines";
import { AuthProvider } from "./context/AuthContext";
import { ExpenseProvider } from "./context/ExpenseContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CategoryProvider } from "./context/CategoryContext";
import { ToastProvider } from "./context/ToastContext";
import { ModalProvider } from "./context/ModalContext";
import { RecurringExpenseProvider } from "./context/RecurringExpenseContext";

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ModalProvider>
          <AuthProvider>
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
                  <Route path="/settings" element={<Settings />} />
                </Route>
                </Routes>
              </BrowserRouter>
            </RecurringExpenseProvider>
          </ExpenseProvider>
        </CategoryProvider>
      </AuthProvider>
      </ModalProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
