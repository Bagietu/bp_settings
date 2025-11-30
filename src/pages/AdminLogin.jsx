import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';

export const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isRegistering) {
                // Registration Flow
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (authError) throw authError;

                if (authData.user) {
                    // Create Profile
                    const { error: profileError } = await supabase.from('profiles').insert([{
                        id: authData.user.id,
                        email: email,
                        role: 'moderator', // Default role
                        status: 'pending' // Default status
                    }]);

                    if (profileError) {
                        console.error("Profile creation failed:", profileError);
                        // Optional: Delete auth user if profile fails? For now just show error.
                        throw new Error("Failed to create user profile.");
                    }

                    setError("Registration successful! Please wait for an admin to approve your account.");
                    setIsRegistering(false);
                }
            } else {
                // Login Flow
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                if (data.user) {
                    // Check Profile
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .single();

                    if (profileError && profileError.code !== 'PGRST116') {
                        throw profileError;
                    }

                    if (!profile) {
                        // Fallback for existing users without profile (auto-create admin if it's the first one? No, just deny for now or assume admin if hardcoded check passed before)
                        // For this migration, let's assume if no profile, we deny or create a pending one.
                        // Let's create a pending profile if missing.
                        await supabase.from('profiles').insert([{
                            id: data.user.id,
                            email: email,
                            role: 'moderator',
                            status: 'pending'
                        }]);
                        setError("Account created but requires approval.");
                        return;
                    }

                    if (profile.status !== 'approved') {
                        setError("Your account is pending approval.");
                        await supabase.auth.signOut();
                        return;
                    }

                    sessionStorage.setItem('isAdmin', 'true'); // Legacy check
                    sessionStorage.setItem('userRole', profile.role); // New Role check
                    sessionStorage.setItem('userEmail', email); // For history logging
                    navigate('/admin/dashboard');
                }
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <div className="text-center mb-8">
                    <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Lock className="h-6 w-6 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isRegistering ? 'Admin Registration' : 'Admin Login'}
                    </h1>
                    <p className="text-slate-500 mt-2">
                        {isRegistering ? 'Create an account to request access' : 'Sign in to manage settings'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <Input
                            type="email"
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Password</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div className={`p-3 text-sm rounded-md ${error.includes('successful') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {isRegistering ? 'Register' : 'Sign In'}
                    </Button>

                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError('');
                            }}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
