import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useData } from '../contexts/DataContext';

export const AdminLogin = () => {
    const { user, login } = useData(); // Get user from context
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const navigate = useNavigate();

    // Auto-redirect if already logged in
    React.useEffect(() => {
        if (user) {
            console.log("User already logged in, redirecting...", user);
            // If pending, they shouldn't be here (DataContext will force logout), but just in case:
            if (user.status === 'pending') {
                // Do nothing, let DataContext handle the logout
            } else if (user.role === 'user') {
                navigate('/');
            } else {
                navigate('/admin/dashboard');
            }
        }
    }, [user, navigate]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        console.log("Starting auth process...");

        const normalizedEmail = email.toLowerCase();

        try {
            if (isRegistering) {
                console.log("Attempting registration for:", normalizedEmail);
                // Registration Flow
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: normalizedEmail,
                    password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                        }
                    }
                });

                if (authError) {
                    console.error("Registration error:", authError);
                    throw authError;
                }
                console.log("Registration successful:", authData);

                if (authData.user) {
                    // Profile is created automatically by database trigger
                    // STRICT BLOCKING: Force logout so they aren't auto-logged in
                    await supabase.auth.signOut();
                    setError("Registration successful! Account created but requires Admin approval.");
                    setIsRegistering(false);
                }
            } else {
                console.log("Attempting login for:", normalizedEmail);
                // Login Flow
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password,
                });

                if (error) {
                    console.error("Login error:", error);
                    throw error;
                }
                console.log("Login successful, user data:", data);

                if (data.user) {
                    // Check Profile
                    console.log("Fetching profile for:", data.user.id);
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .single();

                    if (profileError && profileError.code !== 'PGRST116') {
                        console.error("Profile fetch error:", profileError);
                        throw profileError;
                    }

                    if (!profile) {
                        console.log("No profile found, creating fallback...");
                        // Fallback for existing users without profile
                        await supabase.from('profiles').insert([{
                            id: data.user.id,
                            email: normalizedEmail,
                            role: 'user',
                            status: 'pending'
                        }]);
                        setError("Account created but requires approval.");
                        return;
                    }

                    console.log("Profile found:", profile);

                    // If pending, we still log them in so Layout.jsx can show the "Pending Approval" screen
                    // instead of kicking them back to login page (which causes a flash)
                    if (profile.status !== 'approved') {
                        console.log("User is pending approval. Blocking login.");
                        await supabase.auth.signOut();
                        setError("Account pending approval. Please contact administrator.");
                        return;
                    }

                    // Handle "Remember Me" logic
                    if (!rememberMe) {
                        // Set a timeout to log out after 15 minutes (900,000 ms)
                        setTimeout(async () => {
                            await supabase.auth.signOut();
                            window.location.reload();
                        }, 15 * 60 * 1000);

                        // Store in localStorage so it persists across tab closes/reopens until expiry
                        localStorage.setItem('sessionExpiry', Date.now() + 15 * 60 * 1000);
                    } else {
                        localStorage.removeItem('sessionExpiry');
                    }

                    console.log("Updating context with user data...");
                    login({
                        role: profile.role,
                        email: normalizedEmail,
                        id: data.user.id,
                        status: profile.status,
                        firstName: profile.first_name || data.user.user_metadata?.first_name || '',
                        lastName: profile.last_name || data.user.user_metadata?.last_name || ''
                    });

                    if (profile.role === 'user') {
                        // If pending, send to dashboard to show the blocking message
                        if (profile.status === 'pending') {
                            console.log("User pending, redirecting to /admin/dashboard to show message");
                            navigate('/admin/dashboard');
                        } else {
                            console.log("Redirecting to /");
                            navigate('/');
                        }
                    } else {
                        console.log("Redirecting to /admin/dashboard");
                        navigate('/admin/dashboard');
                    }
                }
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
            console.error("Auth Exception:", err);
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
                    {isRegistering && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">First Name</label>
                                <Input
                                    placeholder="John"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Last Name</label>
                                <Input
                                    placeholder="Doe"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

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

                    {!isRegistering && (
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="rememberMe" className="text-sm text-slate-600">
                                Remember me on this device
                            </label>
                        </div>
                    )}

                    {error && (
                        <div className={`p-3 text-sm rounded-md ${error.includes('successful') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {isRegistering ? 'Register' : 'Sign In'}
                    </Button>

                    {!isRegistering && !rememberMe && (
                        <p className="text-xs text-center text-slate-400 mt-2">
                            Unchecked: Session expires in 15 minutes.
                        </p>
                    )}

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
