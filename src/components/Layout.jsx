import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, MessageSquare, Settings, Menu, X, LogIn, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { useData } from '../contexts/DataContext';

import logo from '../assets/logo.png';

export const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, resetSearch } = useData();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleLogoClick = (e) => {
        // Always reset search when clicking logo
        resetSearch();
        // If we are already on home, prevent default navigation to avoid reload (optional, but good UX)
        if (location.pathname === '/') {
            e.preventDefault();
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
        setIsMobileMenuOpen(false);
    };

    // Only block pending users if they try to access admin pages
    if (user && user.status === 'pending' && location.pathname.startsWith('/admin')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center space-y-6">
                    <div className="mx-auto h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center">
                        <LogIn className="h-8 w-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Account Pending Approval</h1>
                    <p className="text-slate-600">
                        Your account has been created but requires administrator approval before you can access the Admin Dashboard.
                    </p>
                    <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded">
                        You can still browse the main site as a guest.
                    </p>
                    <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                        <LogOut className="h-4 w-4 mr-2" />
                        Go to Home
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto px-4">
                    <div className="flex h-16 items-center justify-between">
                        <Link
                            to="/"
                            onClick={handleLogoClick}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                            <img src={logo} alt="Logo" className="h-8 w-auto" />
                            <span className="text-lg font-bold text-slate-900">Blueprint Settings</span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-6">
                            <Link
                                to="/"
                                className={cn(
                                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-600",
                                    location.pathname === '/' ? "text-blue-600" : "text-slate-600"
                                )}
                            >
                                <Search className="h-4 w-4" />
                                Search
                            </Link>

                            <Link
                                to="/feedback"
                                className={cn(
                                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-600",
                                    location.pathname === '/feedback' ? "text-blue-600" : "text-slate-600"
                                )}
                            >
                                <MessageSquare className="h-4 w-4" />
                                Feedback
                            </Link>

                            {user && (user.role === 'admin' || user.role === 'moderator') && (
                                <Link
                                    to="/admin/dashboard"
                                    className={cn(
                                        "flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-600",
                                        location.pathname.startsWith('/admin') ? "text-blue-600" : "text-slate-600"
                                    )}
                                >
                                    <Settings className="h-4 w-4" />
                                    Admin
                                </Link>
                            )}

                            {user ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="text-slate-600 hover:text-red-600 hover:bg-red-50 gap-2"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </Button>
                            ) : (
                                <Link to="/admin">
                                    <Button variant="ghost" size="sm" className="gap-2">
                                        <LogIn className="h-4 w-4" />
                                        Login/Register
                                    </Button>
                                </Link>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-200 bg-white p-4">
                        <div className="flex flex-col space-y-4">
                            <Link
                                to="/"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-2 text-sm font-medium p-2 rounded-md transition-colors",
                                    location.pathname === '/' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Search className="h-4 w-4" />
                                Search
                            </Link>

                            <Link
                                to="/feedback"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-2 text-sm font-medium p-2 rounded-md transition-colors",
                                    location.pathname === '/feedback' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <MessageSquare className="h-4 w-4" />
                                Feedback
                            </Link>

                            {user && (user.role === 'admin' || user.role === 'moderator') && (
                                <Link
                                    to="/admin/dashboard"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-2 text-sm font-medium p-2 rounded-md transition-colors",
                                        location.pathname.startsWith('/admin') ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <Settings className="h-4 w-4" />
                                    Admin
                                </Link>
                            )}

                            {user ? (
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 text-sm font-medium p-2 rounded-md transition-colors text-red-600 hover:bg-red-50 w-full text-left"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </button>
                            ) : (
                                <Link
                                    to="/admin"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-2 text-sm font-medium p-2 rounded-md transition-colors text-slate-600 hover:bg-slate-50"
                                >
                                    <LogIn className="h-4 w-4" />
                                    Login/Register
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            <main className="container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
};
