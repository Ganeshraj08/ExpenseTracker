import { NavLink } from "react-router-dom";
import { LayoutDashboard, ReceiptText, PieChart, Settings, X } from "lucide-react";
import { cn } from "../../utils/helpers";
import { useAuth } from "../../hooks/useAuth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: ReceiptText },
  { label: "Analytics", href: "/analytics", icon: PieChart },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ isMobileOpen, onClose }) {
  const { user, loginWithGoogle, logout } = useAuth();

  return (
    <>
      {/* Mobile Scrim */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 shadow-2xl md:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 text-primary dark:text-blue-500 font-bold text-xl">
            <ReceiptText className="w-6 h-6" />
            <span>வரவு-செலவு</span>
          </div>
          <button
            className="md:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg transition-colors"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => onClose?.()}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white",
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          {user ? (
            <div
              className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg group transition-colors"
              onClick={logout}
            >
              <div className="flex items-center gap-3">
                <img
                  src={
                    user.photoURL ||
                    `https://ui-avatars.com/api/?name=${user.email}`
                  }
                  alt="User"
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700"
                />
                <div className="text-sm overflow-hidden">
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[100px]">
                    {user.displayName || "User"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="text-xs text-red-500 dark:text-red-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Logout
              </div>
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="w-full flex justify-center items-center py-2 px-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
