import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, MessageSquare, Settings, Menu, X, LogIn } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { useData } from '../contexts/DataContext';

import logo from '../assets/logo.png';

export const Layout = ({ children }) => {
    const location = useLocation();
    const { user } = useData();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navItems = [
        { path: '/', label: 'Search', icon: Search },
        { path: '/feedback', label: 'Feedback', icon: MessageSquare },
        user
            ? { path: '/admin/dashboard', label: 'Admin', icon: Settings }
            : { path: '/admin', label: 'Login/Register', icon: LogIn },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto px-4">
                    <div className="flex h-16 items-center justify-between">
                        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <img src={logo} alt="Logo" className="h-8 w-auto" />
                            <span className="text-lg font-bold text-slate-900">Blueprint Settings</span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-6">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={cn(
                                            "flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-600",
                                            isActive ? "text-blue-600" : "text-slate-600"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
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
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={cn(
                                            "flex items-center gap-2 text-sm font-medium p-2 rounded-md transition-colors",
                                            isActive ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
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
