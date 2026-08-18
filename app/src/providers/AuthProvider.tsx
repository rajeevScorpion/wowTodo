import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { clearLocalUserData } from '../services/session/clearLocalUserData';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const queryClient = useQueryClient();

    // The SIGNED_OUT event carries a null session, so the id of the user being
    // signed out has to be remembered from the previous event.
    const previousUserId = useRef<string | null>(null);

    useEffect(() => {
        // Timeout to prevent infinite loading if getSession hangs
        const timeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        supabase.auth.getSession().then(({ data: { session } }) => {
            clearTimeout(timeout);
            previousUserId.current = session?.user?.id ?? null;
            setSession(session);
            setLoading(false);
        }).catch(() => {
            clearTimeout(timeout);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            clearTimeout(timeout);

            const nextUserId = session?.user?.id ?? null;
            const departingUserId = previousUserId.current;

            // Clear the device on sign-out, and also whenever the account
            // actually changes — a session can be replaced without a
            // SIGNED_OUT in between, and that path leaked the same data.
            const signedOut = event === 'SIGNED_OUT';
            const switchedUser =
                nextUserId !== null && departingUserId !== null && nextUserId !== departingUserId;

            if (signedOut || switchedUser) {
                // Deliberately not awaited: Supabase serialises auth callbacks,
                // so awaiting here would stall subsequent auth events. Cleanup
                // swallows its own errors and must never block sign-out.
                void clearLocalUserData(queryClient, departingUserId);
            }

            previousUserId.current = nextUserId;
            setSession(session);
            setLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
