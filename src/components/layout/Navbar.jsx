import { useState } from "react";
import { Menu as MenuIcon, Plus as PlusIcon } from "lucide-react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { ExpenseForm } from "../expenses/ExpenseForm";
import { useExpenses } from "../../context/ExpenseContext";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../context/ToastContext";

export function Navbar({ onMobileMenuClick }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addExpense } = useExpenses();
  const { user } = useAuth();
  const { addToast } = useToast();



  const handleAddExpense = async (data) => {
    try {
      await addExpense(data);
      setIsModalOpen(false);
    } catch (error) {
      addToast("Failed to add expense. Check console for details.", "error");
    }
  };

  return (
    <>
      <header className="h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 transition-colors duration-200">
        <div className="flex items-center">
          <button
            className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 -ml-2 mr-2 transition-colors"
            onClick={onMobileMenuClick}
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold text-primary md:hidden">வரவு-செலவு</h1>
        </div>

        <div className="flex items-center gap-4">
          <Button className="gap-2 rounded-full sm:rounded-lg shadow-sm hover:-translate-y-0.5 transition-transform" size="sm" onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Add Transaction</span>
          </Button>
        </div>
      </header>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Transaction">
        {!user ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p className="mb-2 text-slate-900 dark:text-slate-200 font-medium">You are not signed in.</p>
            <p className="text-sm">Please sign in with Google via the Sidebar to add expenses.</p>
          </div>
        ) : (
          <ExpenseForm
            onSubmit={handleAddExpense}
            onCancel={() => setIsModalOpen(false)}
          />
        )}
      </Modal>

      {/* Floating Action Button for Mobile only */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-700 active:scale-95 transition-all outline-none focus:ring-4 focus:ring-blue-500/30"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>
    </>
  );
}
