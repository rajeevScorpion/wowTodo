import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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

    useEffect(() => {
        // Timeout to prevent infinite loading if getSession hangs
        const timeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        supabase.auth.getSession().then(({ data: { session } }) => {
            clearTimeout(timeout);
            setSession(session);
            setLoading(false);
        }).catch(() => {
            clearTimeout(timeout);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            clearTimeout(timeout);
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
