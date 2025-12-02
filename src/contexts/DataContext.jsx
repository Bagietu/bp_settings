import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const [settings, setSettings] = useState([]);
    const [fields, setFields] = useState([]);
    const [categories, setCategories] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [votes, setVotes] = useState([]);
    const [appConfig, setAppConfig] = useState({ vote_period_days: '7' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Add error state

    // Search State (Global for Layout access)
    const [legSearch, setLegSearch] = useState('');
    const [skuSearch, setSkuSearch] = useState('');
    const [selectedCaseSize, setSelectedCaseSize] = useState(null);

    const resetSearch = () => {
        setLegSearch('');
        setSkuSearch('');
        setSelectedCaseSize(null);
    };

    // Fetch Initial Data
    const isFetchingRef = React.useRef(false);

    const fetchData = async () => {
        if (isFetchingRef.current) {
            console.log("[Data] Fetch already in progress, skipping...");
            return;
        }
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);

        // Helper to race a promise against a timeout
        const withTimeout = (promise, ms = 15000, errorMsg = "Data load timed out") => {
            return Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
            ]);
        };

        // Helper for granular fetching with EXPONENTIAL BACKOFF logic
        const fetchTable = async (tableName, queryPromise, isCritical = false, retries = 3, delay = 1000) => {
            console.log(`[Data] Fetching ${tableName}...`);
            try {
                const { data, error } = await withTimeout(queryPromise, 15000, `${tableName} timed out`);
                if (error) throw error;
                console.log(`[Data] Success ${tableName}: ${data?.length ?? 0} rows`);
                return data;
            } catch (err) {
                if (retries > 0) {
                    console.warn(`[Data] Failed ${tableName}, retrying in ${delay}ms... (${retries} retries left)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    // Exponential backoff: double the delay for next retry
                    return fetchTable(tableName, queryPromise, isCritical, retries - 1, delay * 2);
                }
                console.error(`[Data] Failed ${tableName}:`, err);
                if (isCritical) {
                    // Phase 32: Graceful Failure - Do NOT re-throw. Just return null and let the UI handle the missing data.
                    // We will set the global error state so the UI knows something went wrong, but we won't crash the whole flow.
                    setError(`Failed to load ${tableName}. Please check your connection.`);
                    return null;
                }
                return null; // Return null for non-critical failures (partial load)
            }
        };

        try {
            // SEQUENTIAL LOADING to prevent browser connection saturation
            // Phase 31: Reordered to fetch 'categories' (smallest) first to "warm up" connection
            // 1. Critical Data (Categories, Settings, Fields) - Load one by one
            const catsData = await fetchTable('categories', supabase.from('categories').select('*'), true);
            const settingsData = await fetchTable('settings', supabase.from('settings').select('*'), true);
            const fieldsData = await fetchTable('fields', supabase.from('fields').select('*'), true);

            // 2. Non-Critical Data (Feedback, Votes, Config) - Load one by one
            const feedbackData = await fetchTable('feedback', supabase.from('feedback').select('*'), false);
            const votesData = await fetchTable('votes', supabase.from('votes').select('*'), false);
            const configData = await fetchTable('app_config', supabase.from('app_config').select('*'), false);

            if (settingsData) {
                // Flatten the 'data' JSONB column back into the object for the UI
                const flattenedSettings = settingsData.map(s => ({
                    ...s,
                    ...s.data, // Spread the JSONB fields (temp, speed, etc.) to top level
                    caseSize: s.case_size, // Map snake_case to camelCase
                    legNumber: s.leg_number, // Map snake_case to camelCase
                    lastUpdated: s.last_updated // Map snake_case to camelCase
                }));
                setSettings(flattenedSettings);
            }
            if (fieldsData) {
                // Map category_id to categoryId for UI consistency
                const mappedFields = fieldsData.map(f => ({
                    ...f,
                    categoryId: f.category_id
                }));
                setFields(mappedFields);
            }
            if (catsData) setCategories(catsData);
            if (feedbackData) setFeedback(feedbackData);
            if (votesData) setVotes(votesData);
            if (configData) {
                const configObj = configData.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
                setAppConfig(prev => ({ ...prev, ...configObj }));
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setError(error.message || "Failed to load data. Please check your connection.");
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };

    const [user, setUser] = useState(null);

    // Initialize User from Session
    useEffect(() => {
        const isAdmin = sessionStorage.getItem('isAdmin');
        const role = sessionStorage.getItem('userRole');
        const email = sessionStorage.getItem('userEmail');
        const id = sessionStorage.getItem('userId');
        const status = sessionStorage.getItem('userStatus');
        const firstName = sessionStorage.getItem('userFirstName');
        const lastName = sessionStorage.getItem('userLastName');
        if (isAdmin) {
            setUser({ role, email, id, status, firstName, lastName });
        }
    }, []);

    // Auth Methods
    const login = (userData) => {
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('userRole', userData.role);
        sessionStorage.setItem('userEmail', userData.email);
        sessionStorage.setItem('userId', userData.id);
        sessionStorage.setItem('userStatus', userData.status);
        sessionStorage.setItem('userFirstName', userData.firstName || '');
        sessionStorage.setItem('userLastName', userData.lastName || '');
        setUser(userData);
    };

    const logout = async () => {
        try {
            // SAFE LOGOUT: Race against a timeout to prevent hanging
            const signOutPromise = supabase.auth.signOut();
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));

            await Promise.race([signOutPromise, timeoutPromise]);
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            // ALWAYS clear local state
            sessionStorage.removeItem('isAdmin');
            sessionStorage.removeItem('userRole');
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('userId');
            sessionStorage.removeItem('userStatus');
            sessionStorage.removeItem('userFirstName');
            sessionStorage.removeItem('userLastName');
            localStorage.removeItem('sessionExpiry');

            // Phase 33: Aggressive Cleanup - Nuke Supabase keys to prevent zombie sessions
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) {
                    localStorage.removeItem(key);
                }
            });

            setUser(null);
            // Navigation is now handled by the caller (Layout.jsx)
        }
    };

    useEffect(() => {
        // REMOVED: Initial Data Fetch (fetchData()) - We rely on the auth listener to trigger this now
        // This prevents double-fetching on load (once here, once in auth listener)
        // Phase 30: Consolidated all fetching into the listener below to avoid race conditions.

        // STRICT SESSION CHECK on mount
        // Instead of getSession (local), use getUser (server) to verify token validity
        supabase.auth.getUser().then(({ data: { user }, error }) => {
            if (error || !user) {
                console.log("Strict session check failed. Clearing local state.");
                setUser(null);
                sessionStorage.clear();
                localStorage.removeItem('sessionExpiry');

                // Phase 33: Aggressive Cleanup on failed check
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-')) {
                        console.log("Nuking corrupt/stale session key:", key);
                        localStorage.removeItem(key);
                    }
                });
            }
        });

        // Listen for Auth Changes (Syncs UI with Supabase Session)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth State Change:", event, session?.user?.email);

            // Phase 30: Unified Data Loading Logic
            // We fetch data on:
            // 1. SIGNED_IN: User just logged in.
            // 2. INITIAL_SESSION: App just loaded (whether user is logged in OR guest).
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                console.log("Session event detected, triggering data fetch...");
                // Add a small delay to ensure connection is fully established/settled
                // Phase 31: Increased delay to 1000ms to rule out connection saturation
                setTimeout(() => {
                    fetchData();
                }, 1000);

                if (session) {
                    // Fetch profile to get role and name
                    console.log("Fetching profile for user:", session.user.id);
                    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

                    if (error) {
                        console.error("Error fetching profile in listener:", error);
                    }

                    // Even if profile is missing, we MUST set the user state so the app knows we are logged in.
                    // Default to 'user' role and 'pending' status if profile is missing.
                    // Fallback to user_metadata for name if not in profile
                    const userData = {
                        id: session.user.id,
                        email: session.user.email,
                        role: profile?.role || 'user',
                        status: profile?.status || 'pending',
                        firstName: profile?.first_name || session.user.user_metadata?.first_name || '',
                        lastName: profile?.last_name || session.user.user_metadata?.last_name || ''
                    };

                    // STRICT BLOCKING: If user is pending, force logout immediately.
                    if (userData.status === 'pending') {
                        console.log("User is pending. Forcing logout.");
                        await logout(); // Use safe logout
                        return; // Stop execution
                    }

                    console.log("Setting user in context:", userData);
                    setUser(userData);

                    // Keep Session Storage in sync
                    sessionStorage.setItem('isAdmin', 'true');
                    sessionStorage.setItem('userRole', userData.role);
                    sessionStorage.setItem('userEmail', userData.email);
                    sessionStorage.setItem('userId', userData.id);
                    sessionStorage.setItem('userStatus', userData.status);
                    sessionStorage.setItem('userFirstName', userData.firstName);
                    sessionStorage.setItem('userLastName', userData.lastName);
                } else if (event === 'INITIAL_SESSION' && !session) {
                    // Guest Mode: INITIAL_SESSION with no session means we are a guest.
                    // We still fetched data above, so we just ensure user state is null.
                    console.log("Guest session initialized.");
                    setUser(null);
                }
            } else if (event === 'SIGNED_OUT') {
                // Handle explicit sign out
                console.log("User signed out. Clearing context.");
                setUser(null);
                sessionStorage.clear();
                localStorage.removeItem('sessionExpiry');
            }
        });

        // Check for session expiry (Local "Remember Me" logic)
        const checkSessionExpiry = async () => {
            const expiry = localStorage.getItem('sessionExpiry');
            if (expiry && Date.now() > parseInt(expiry, 10)) {
                console.log("Session expired. Logging out.");
                await logout();
            }
        };

        checkSessionExpiry();
        const interval = setInterval(checkSessionExpiry, 60000);

        return () => {
            authListener.subscription.unsubscribe();
            clearInterval(interval);
        };
    }, []);

    // --- History Logging ---
    const logHistory = async (action, details) => {
        let userEmail = sessionStorage.getItem('userEmail');

        if (!userEmail) {
            const { data: { user } } = await supabase.auth.getUser();
            userEmail = user?.email || 'unknown';
        }

        const { error } = await supabase.from('history').insert([{
            user_email: userEmail,
            action,
            details
        }]);
        if (error) console.error("Error logging history:", error);
    };

    // --- Settings Management ---
    const addSetting = async (newSetting) => {
        // Separate standard fields from dynamic fields
        const { sku, legNumber, caseSize, program, ...dynamicData } = newSetting;

        const { data, error } = await supabase.from('settings').insert([{
            sku,
            leg_number: legNumber,
            case_size: caseSize,
            last_updated: new Date().toISOString(),
            data: dynamicData
        }]).select();

        if (error) {
            console.error("Error adding setting:", error);
            return { success: false, message: "Failed to add setting" };
        } else if (data) {
            const flattened = { ...data[0], ...data[0].data, lastUpdated: data[0].last_updated };
            setSettings(prev => [...prev, flattened]);
            logHistory('create', { sku, legNumber, caseSize, data: dynamicData });
            return { success: true };
        }
    };

    const updateSetting = async (id, updatedSetting) => {
        const oldSetting = settings.find(s => s.id === id);
        const { sku, legNumber, caseSize, program, ...dynamicData } = updatedSetting;

        const { error } = await supabase.from('settings').update({
            sku,
            leg_number: legNumber,
            case_size: caseSize,
            last_updated: new Date().toISOString(),
            data: dynamicData
        }).eq('id', id);

        if (error) {
            console.error("Error updating setting:", error);
            return { success: false, message: "Failed to update setting" };
        } else {
            setSettings(prev => prev.map(s => s.id === id ? { ...s, ...updatedSetting, lastUpdated: new Date().toISOString() } : s));

            // Calculate Diff
            const changes = {};
            // Check standard fields
            if (oldSetting.sku !== sku) changes.sku = { from: oldSetting.sku, to: sku };
            if (oldSetting.caseSize !== caseSize) changes.caseSize = { from: oldSetting.caseSize, to: caseSize };
            if (oldSetting.legNumber !== legNumber) changes.legNumber = { from: oldSetting.legNumber, to: legNumber };

            // Check dynamic fields
            Object.keys(dynamicData).forEach(key => {
                if (oldSetting[key] !== dynamicData[key]) {
                    changes[key] = { from: oldSetting[key], to: dynamicData[key] };
                }
            });

            logHistory('update', { id, sku, legNumber, changes });
            return { success: true };
        }
    };

    const deleteSetting = async (id) => {
        const setting = settings.find(s => s.id === id);
        const { error } = await supabase.from('settings').delete().eq('id', id);
        if (error) {
            console.error("Error deleting setting:", error);
            return { success: false, message: "Failed to delete setting" };
        } else {
            setSettings(prev => prev.filter(s => s.id !== id));
            logHistory('delete', { sku: setting?.sku, legNumber: setting?.legNumber, backup: setting });
            return { success: true };
        }
    };

    // --- Fields Management ---
    const addField = async (field) => {
        const { data, error } = await supabase.from('fields').insert([{
            name: field.name,
            key: field.key,
            type: field.type,
            category_id: field.categoryId
        }]).select();

        if (error) {
            console.error("Error adding field:", error);
            return { success: false, message: "Failed to add field" };
        } else if (data) {
            const newField = { ...data[0], categoryId: data[0].category_id };
            setFields(prev => [...prev, newField]);
            return { success: true };
        }
    };

    const updateField = async (id, updates) => {
        // Map UI updates to DB columns
        const dbUpdates = {};
        if (updates.categoryId) dbUpdates.category_id = updates.categoryId;
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.key) dbUpdates.key = updates.key;

        const { error } = await supabase.from('fields').update(dbUpdates).eq('id', id);

        if (error) {
            console.error("Error updating field:", error);
            return { success: false, message: "Failed to update field" };
        } else {
            setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
            return { success: true };
        }
    };

    const removeField = async (id) => {
        const { error } = await supabase.from('fields').delete().eq('id', id);
        if (error) {
            console.error("Error deleting field:", error);
            return { success: false, message: "Failed to delete field" };
        } else {
            setFields(prev => prev.filter(f => f.id !== id));
            return { success: true };
        }
    };

    // --- Categories Management ---
    const addCategory = async (name) => {
        const { data, error } = await supabase.from('categories').insert([{ name }]).select();
        if (error) {
            console.error("Error adding category:", error);
            return { success: false, message: "Failed to add category" };
        } else if (data) {
            setCategories(prev => [...prev, data[0]]);
            return { success: true };
        }
    };

    const updateCategory = async (id, name) => {
        const { error } = await supabase.from('categories').update({ name }).eq('id', id);
        if (error) {
            console.error("Error updating category:", error);
            return { success: false, message: "Failed to update category" };
        } else {
            setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
            return { success: true };
        }
    };

    const deleteCategory = async (id) => {
        // Check if fields exist locally first to save an API call
        if (fields.some(f => f.categoryId === id)) {
            return { success: false, message: "Cannot delete category with fields. Move fields first." };
        }

        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) {
            console.error("Error deleting category:", error);
            return { success: false, message: "Failed to delete category" };
        } else {
            setCategories(prev => prev.filter(c => c.id !== id));
            return { success: true };
        }
    };

    // --- Feedback Management ---
    const addFeedback = async (item) => {
        const { error } = await supabase.from('feedback').insert([{
            type: item.type,
            message: item.message,
            sku: item.sku,
            leg_number: item.legNumber,
            status: 'pending'
        }]);

        if (error) {
            console.error("Error submitting feedback:", error);
            return { success: false, message: "Failed to submit feedback" };
        } else {
            // Refetch or add optimistically. Since ID is generated by DB, refetching or ignoring local update is easiest.
            // We'll just refetch feedback for admin view.
            const { data } = await supabase.from('feedback').select('*');
            if (data) setFeedback(data);
            return { success: true };
        }
    };

    const resolveFeedback = async (id) => {
        const { error } = await supabase.from('feedback').update({ status: 'resolved' }).eq('id', id);
        if (error) {
            console.error("Error resolving feedback:", error);
        } else {
            setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: 'resolved' } : f));
        }
    };

    const deleteFeedback = async (id) => {
        const { error } = await supabase.from('feedback').delete().eq('id', id);
        if (error) {
            console.error("Error deleting feedback:", error);
        } else {
            setFeedback(prev => prev.filter(f => f.id !== id));
        }
    };

    // --- Votes Management ---
    const addVote = async (settingId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: "Must be logged in to vote." };

        // Check local limit first (optimistic)
        const votePeriodDays = parseInt(appConfig.vote_period_days || '7', 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - votePeriodDays);

        const existingVote = votes.find(v =>
            v.setting_id === settingId &&
            v.user_id === user.id &&
            new Date(v.created_at) > cutoff
        );

        if (existingVote) {
            return { success: false, message: `You have already marked this as working in the last ${votePeriodDays} days.` };
        }

        const { data, error } = await supabase.from('votes').insert([{
            user_id: user.id,
            setting_id: settingId
        }]).select();

        if (error) {
            console.error("Error adding vote:", error);
            return { success: false, message: `Failed to record vote: ${error.message}` };
        } else {
            setVotes(prev => [...prev, data[0]]);
            return { success: true, message: "Marked as working!" };
        }
    };

    // --- App Config Management ---
    const updateAppConfig = async (key, value) => {
        const { error } = await supabase.from('app_config').upsert({ key, value });
        if (error) {
            console.error("Error updating config:", error);
            return { success: false, message: "Failed to update config" };
        } else {
            setAppConfig(prev => ({ ...prev, [key]: value }));
            return { success: true };
        }
    };

    const value = {
        settings, addSetting, updateSetting, deleteSetting,
        fields, addField, updateField, removeField,
        categories, addCategory, updateCategory, deleteCategory,
        feedback, addFeedback, resolveFeedback, deleteFeedback,
        loading, error,
        user, login, logout,
        votes, addVote,
        appConfig, updateAppConfig,
        legSearch, setLegSearch,
        skuSearch, setSkuSearch,
        selectedCaseSize, setSelectedCaseSize,
        refreshData: fetchData,
        resetSearch
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export function useData() {
    return useContext(DataContext);
}
