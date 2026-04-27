import { useState, useEffect, useRef } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";

export function Dialogs({ confirmState, promptState, onCloseConfirm, onClosePrompt }) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (promptState?.defaultValue !== undefined) {
      setInputValue(promptState.defaultValue);
    } else {
      setInputValue("");
    }
  }, [promptState]);

  useEffect(() => {
    if (promptState && inputRef.current) {
       setTimeout(() => {
          inputRef.current.focus();
       }, 50);
    }
  }, [promptState]);

  const handlePromptSubmit = (e) => {
    e.preventDefault();
    if (promptState?.resolve) {
      promptState.resolve(inputValue);
    }
  };

  return (
    <>
      {/* Confirm Dialog */}
      <Modal 
        isOpen={!!confirmState} 
        onClose={() => confirmState?.resolve(false)} 
        title={confirmState?.title || "Confirm"}
        compact
      >
        {confirmState && (
          <div className="space-y-4 pt-2">
            <p className="text-slate-700 dark:text-slate-300">
              {confirmState.message}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button 
                variant="ghost" 
                onClick={() => confirmState.resolve(false)}
              >
                {confirmState.cancelText || "Cancel"}
              </Button>
              <Button 
                variant={confirmState.confirmVariant || "primary"}
                className={confirmState.confirmVariant === "danger" || confirmState.isDanger ? "bg-red-600 hover:bg-red-700 text-white dark:text-white" : ""}
                onClick={() => confirmState.resolve(true)}
              >
                {confirmState.confirmText || "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Prompt Dialog */}
      <Modal 
        isOpen={!!promptState} 
        onClose={() => promptState?.resolve(null)} 
        title={promptState?.title || "Input Required"}
        compact
      >
        {promptState && (
          <form onSubmit={handlePromptSubmit} className="space-y-4 pt-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {promptState.label}
            </p>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              placeholder={promptState.placeholder || "Enter text..."}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
              <Button 
                type="button"
                variant="ghost" 
                onClick={() => promptState.resolve(null)}
              >
                {promptState.cancelText || "Cancel"}
              </Button>
              <Button 
                type="submit"
                variant="primary"
                disabled={!inputValue.trim()}
              >
                {promptState.confirmText || "Save"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
