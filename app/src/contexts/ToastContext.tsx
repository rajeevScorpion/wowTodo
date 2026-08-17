import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'info' | 'success' | 'warning';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (message: string, type?: ToastType) => void;
    dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType>({
    toasts: [],
    showToast: () => {},
    dismissToast: () => {},
});

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, type: ToastType = 'info') => {
            const id = ++nextId;
            setToasts((prev) => [...prev, { id, message, type }]);

            // Auto-dismiss after 4 seconds
            setTimeout(() => {
                dismissToast(id);
            }, 4000);
        },
        [dismissToast]
    );

    return (
        <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
            {children}
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
