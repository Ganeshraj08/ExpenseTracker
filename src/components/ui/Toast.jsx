import { CheckCircle, XCircle, X } from "lucide-react";

export function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-full sm:max-w-sm z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start p-4 rounded-xl shadow-lg border pointer-events-auto transition-all transform duration-300 animate-in slide-in-from-bottom-5 fade-in ${
            toast.type === "error"
              ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200"
              : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900 text-green-800 dark:text-green-200"
          }`}
        >
          <div className="flex-shrink-0">
            {toast.type === "error" ? (
              <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
            )}
          </div>
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="text-sm font-medium break-words overflow-wrap-anywhere">{toast.message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => removeToast(toast.id)}
              className="inline-flex rounded-md bg-transparent text-current hover:opacity-75 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
