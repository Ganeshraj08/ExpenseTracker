import { createContext, useContext, useState, useCallback } from "react";
import { Dialogs } from "../components/ui/Dialogs";

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);
  const [promptState, setPromptState] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        resolve: (value) => {
          setConfirmState(null);
          resolve(value);
        },
      });
    });
  }, []);

  const prompt = useCallback((options) => {
    return new Promise((resolve) => {
      setPromptState({
        ...options,
        resolve: (value) => {
          setPromptState(null);
          resolve(value);
        },
      });
    });
  }, []);

  return (
    <ModalContext.Provider value={{ confirm, prompt }}>
      {children}
      <Dialogs 
         confirmState={confirmState} 
         promptState={promptState} 
         onCloseConfirm={() => confirmState?.resolve(false)}
         onClosePrompt={() => promptState?.resolve(null)}
      />
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
