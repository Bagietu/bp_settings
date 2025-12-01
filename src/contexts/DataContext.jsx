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

    // Fetch Initial Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsRes, fieldsRes, catsRes, feedbackRes, votesRes, configRes] = await Promise.all([
                supabase.from('settings').select('*'),
                supabase.from('fields').select('*'),
                supabase.from('categories').select('*'),
                supabase.from('feedback').select('*'),
                supabase.from('votes').select('*'),
                supabase.from('app_config').select('*')
            ]);

            if (settingsRes.data) {
                // Flatten the 'data' JSONB column back into the object for the UI
                const flattenedSettings = settingsRes.data.map(s => ({
                    ...s,
                    ...s.data, // Spread the JSONB fields (temp, speed, etc.) to top level
                    caseSize: s.case_size, // Map snake_case to camelCase
                    legNumber: s.leg_number, // Map snake_case to camelCase
                    lastUpdated: s.last_updated // Map snake_case to camelCase
                }));
                setSettings(flattenedSettings);
            }
            if (fieldsRes.data) {
                // Map category_id to categoryId for UI consistency
                const mappedFields = fieldsRes.data.map(f => ({
                    ...f,
                    categoryId: f.category_id
                }));
                setFields(mappedFields);
            }
            if (catsRes.data) setCategories(catsRes.data);
            if (feedbackRes.data) setFeedback(feedbackRes.data);
            if (votesRes.data) setVotes(votesRes.data);
            if (configRes.data) {
                const configObj = configRes.data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
                setAppConfig(prev => ({ ...prev, ...configObj }));
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const [user, setUser] = useState(null);

    // Initialize User from Session
    useEffect(() => {
        const isAdmin = sessionStorage.getItem('isAdmin');
        const role = sessionStorage.getItem('userRole');
        const email = sessionStorage.getItem('userEmail');
        const id = sessionStorage.getItem('userId');
        if (isAdmin) {
            setUser({ role, email, id });
        }
    }, []);

    // Auth Methods
    const login = (userData) => {
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('userRole', userData.role);
        sessionStorage.setItem('userEmail', userData.email);
        sessionStorage.setItem('userId', userData.id);
        setUser(userData);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        sessionStorage.removeItem('isAdmin');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('userId');
        localStorage.removeItem('sessionExpiry');
        setUser(null);
        window.location.href = '/admin'; // Redirect to login page
    };

    useEffect(() => {
        fetchData();

        // Check for session expiry (for "Remember Me: Unchecked" logic)
        const checkSessionExpiry = async () => {
            const expiry = localStorage.getItem('sessionExpiry');
            if (expiry && Date.now() > parseInt(expiry, 10)) {
                console.log("Session expired. Logging out.");
                logout();
            }
        };

        // Check immediately and then every minute
        checkSessionExpiry();
        const interval = setInterval(checkSessionExpiry, 60000);

        return () => clearInterval(interval);
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

    return (
        <DataContext.Provider value={{
            settings, addSetting, updateSetting, deleteSetting,
            fields, addField, updateField, removeField,
            categories, addCategory, updateCategory, deleteCategory,
            feedback, addFeedback, resolveFeedback, deleteFeedback,
            loading,
            user, login, logout,
            votes, addVote,
            appConfig, updateAppConfig
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
