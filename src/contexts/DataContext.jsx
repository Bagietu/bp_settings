import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const [settings, setSettings] = useState([]);
    const [fields, setFields] = useState([]);
    const [categories, setCategories] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch Initial Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsRes, fieldsRes, catsRes, feedbackRes] = await Promise.all([
                supabase.from('settings').select('*'),
                supabase.from('fields').select('*'),
                supabase.from('categories').select('*'),
                supabase.from('feedback').select('*')
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
        if (isAdmin) {
            setUser({ role, email });
        }
    }, []);

    // Auth Methods
    const login = (userData) => {
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('userRole', userData.role);
        sessionStorage.setItem('userEmail', userData.email);
        setUser(userData);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        sessionStorage.removeItem('isAdmin');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('userEmail');
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
            alert("Failed to add setting");
        } else if (data) {
            const flattened = { ...data[0], ...data[0].data, lastUpdated: data[0].last_updated };
            setSettings(prev => [...prev, flattened]);
            logHistory('create', { sku, legNumber, caseSize, data: dynamicData });
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
            alert("Failed to update setting");
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
        }
    };

    const deleteSetting = async (id) => {
        const setting = settings.find(s => s.id === id);
        const { error } = await supabase.from('settings').delete().eq('id', id);
        if (error) {
            console.error("Error deleting setting:", error);
            alert("Failed to delete setting");
        } else {
            setSettings(prev => prev.filter(s => s.id !== id));
            logHistory('delete', { sku: setting?.sku, legNumber: setting?.legNumber, backup: setting });
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
            alert("Failed to add field");
        } else if (data) {
            const newField = { ...data[0], categoryId: data[0].category_id };
            setFields(prev => [...prev, newField]);
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
            alert("Failed to update field");
        } else {
            setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
        }
    };

    const removeField = async (id) => {
        const { error } = await supabase.from('fields').delete().eq('id', id);
        if (error) {
            console.error("Error deleting field:", error);
            alert("Failed to delete field");
        } else {
            setFields(prev => prev.filter(f => f.id !== id));
        }
    };

    // --- Categories Management ---
    const addCategory = async (name) => {
        const { data, error } = await supabase.from('categories').insert([{ name }]).select();
        if (error) {
            console.error("Error adding category:", error);
            alert("Failed to add category");
        } else if (data) {
            setCategories(prev => [...prev, data[0]]);
        }
    };

    const updateCategory = async (id, name) => {
        const { error } = await supabase.from('categories').update({ name }).eq('id', id);
        if (error) {
            console.error("Error updating category:", error);
            alert("Failed to update category");
        } else {
            setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
        }
    };

    const deleteCategory = async (id) => {
        // Check if fields exist locally first to save an API call
        if (fields.some(f => f.categoryId === id)) {
            alert("Cannot delete category with fields. Move fields first.");
            return;
        }

        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) {
            console.error("Error deleting category:", error);
            alert("Failed to delete category");
        } else {
            setCategories(prev => prev.filter(c => c.id !== id));
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
            alert("Failed to submit feedback");
        } else {
            // Refetch or add optimistically. Since ID is generated by DB, refetching or ignoring local update is easiest.
            // We'll just refetch feedback for admin view.
            const { data } = await supabase.from('feedback').select('*');
            if (data) setFeedback(data);
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

    return (
        <DataContext.Provider value={{
            settings, addSetting, updateSetting, deleteSetting,
            fields, addField, updateField, removeField,
            categories, addCategory, updateCategory, deleteCategory,
            feedback, addFeedback, resolveFeedback, deleteFeedback,
            loading,
            user, login, logout
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
