import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, Check, X, FolderPlus, Users, Clock, Shield } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export const AdminDashboard = () => {
    const navigate = useNavigate();
    const {
        settings, addSetting, updateSetting, deleteSetting,
        fields, addField, updateField, removeField,
        categories, addCategory, updateCategory, deleteCategory,
        feedback, resolveFeedback, deleteFeedback,
        logout,
        votes, appConfig, updateAppConfig
    } = useData();

    const [activeTab, setActiveTab] = useState('settings');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [activeCategoryTab, setActiveCategoryTab] = useState(categories[0]?.id || '');

    // RBAC & History State
    const [userRole, setUserRole] = useState('moderator');
    const [users, setUsers] = useState([]);
    const [history, setHistory] = useState([]);
    const [viewingHistoryItem, setViewingHistoryItem] = useState(null);

    // Config State
    const [configForm, setConfigForm] = useState({ vote_period_days: '7' });

    useEffect(() => {
        const isAdmin = sessionStorage.getItem('isAdmin');
        const role = sessionStorage.getItem('userRole') || 'moderator';
        setUserRole(role);

        if (!isAdmin) {
            navigate('/admin');
        } else {
            if (role === 'admin') {
                fetchUsers();
                if (activeTab === 'history') {
                    fetchHistory();
                }
            }
        }
        if (appConfig) {
            setConfigForm(appConfig);
        }
    }, [navigate, activeTab, appConfig]);

    const fetchUsers = async () => {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (data) setUsers(data);
    };

    const fetchHistory = async () => {
        const { data, error } = await supabase.from('history').select('*').order('created_at', { ascending: false }).limit(100);
        if (data) setHistory(data);
    };

    const deleteHistoryItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this log entry?")) return;

        const { error } = await supabase.from('history').delete().eq('id', id);
        if (error) {
            console.error("Error deleting history:", error);
            alert("Failed to delete history item");
        } else {
            setHistory(prev => prev.filter(h => h.id !== id));
        }
    };

    const updateUserStatus = async (id, status) => {
        const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
        if (!error) {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
        }
    };

    const handleLogout = () => {
        logout();
    };

    const handleSaveConfig = (e) => {
        e.preventDefault();
        updateAppConfig('vote_period_days', configForm.vote_period_days);
        alert("Configuration saved!");
    };

    // Settings Form State
    const [settingForm, setSettingForm] = useState({});

    const openSettingModal = (setting = null) => {
        setEditingItem(setting);
        setSettingForm(setting || { sku: '', caseSize: '', legNumber: '' });
        setActiveCategoryTab(categories[0]?.id);
        setIsModalOpen(true);
    };

    const saveSetting = (e) => {
        e.preventDefault();
        if (editingItem) {
            updateSetting(editingItem.id, settingForm);
        } else {
            addSetting(settingForm);
        }
        setIsModalOpen(false);
    };

    // Fields & Categories Form State
    const [newField, setNewField] = useState({ name: '', key: '', type: 'text', categoryId: categories[0]?.id || '' });
    const [newCategory, setNewCategory] = useState('');

    const handleAddField = (e) => {
        e.preventDefault();
        if (newField.name && newField.key && newField.categoryId) {
            addField(newField);
            setNewField({ ...newField, name: '', key: '', type: 'text' });
        }
    };

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (newCategory) {
            addCategory(newCategory);
            setNewCategory('');
        }
    };

    const tabs = [
        { id: 'settings', label: 'Settings', icon: null },
        { id: 'structure', label: 'Structure', icon: null },
        { id: 'feedback', label: 'Feedback', icon: null },
    ];

    if (userRole === 'admin') {
        tabs.push({ id: 'users', label: 'Users', icon: Users });
        tabs.push({ id: 'history', label: 'History', icon: Clock });
        tabs.push({ id: 'votes', label: 'Votes', icon: Check });
        tabs.push({ id: 'config', label: 'Config', icon: Shield });
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                    {userRole === 'admin' && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase">Admin</span>}
                    {userRole === 'moderator' && <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded uppercase">Moderator</span>}
                </div>
                <Button variant="ghost" onClick={handleLogout}>Logout</Button>
            </div>

            <div className="flex space-x-1 border-b border-slate-200 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize flex items-center gap-2 whitespace-nowrap",
                            activeTab === tab.id
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {tab.icon && <tab.icon className="h-4 w-4" />}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => openSettingModal()} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Setting
                        </Button>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-700 font-medium">
                                    <tr>
                                        <th className="p-4">SKU</th>
                                        <th className="p-4">Case Size</th>
                                        <th className="p-4">Leg</th>
                                        <th className="p-4">Last Updated</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {settings.map((setting) => (
                                        <tr key={setting.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-medium">{setting.sku}</td>
                                            <td className="p-4">{setting.caseSize}</td>
                                            <td className="p-4">{setting.legNumber}</td>
                                            <td className="p-4 text-slate-500">
                                                {setting.lastUpdated ? new Date(setting.lastUpdated).toLocaleString() : '-'}
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => openSettingModal(setting)}>
                                                    <Edit2 className="h-4 w-4 text-slate-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteSetting(setting.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* STRUCTURE TAB (Categories & Fields) */}
            {activeTab === 'structure' && (
                <div className="grid gap-8 md:grid-cols-3">
                    {/* Categories Column */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Categories</h3>
                        <form onSubmit={handleAddCategory} className="flex gap-2">
                            <Input
                                placeholder="New Category Name"
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                            />
                            <Button type="submit" size="icon"><Plus className="h-4 w-4" /></Button>
                        </form>
                        <div className="space-y-2">
                            {categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                    <span>{cat.name}</span>
                                    <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Fields Column */}
                    <div className="md:col-span-2 space-y-6">
                        <h3 className="text-lg font-semibold">Fields</h3>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h4 className="text-sm font-medium mb-4">Add New Field</h4>
                            <form onSubmit={handleAddField} className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">Display Name</label>
                                    <Input
                                        placeholder="e.g. Temperature"
                                        value={newField.name}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setNewField({
                                                ...newField,
                                                name: val,
                                                key: val.toLowerCase().replace(/\s+/g, '_')
                                            });
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">Key</label>
                                    <Input
                                        placeholder="e.g. temp"
                                        value={newField.key}
                                        onChange={e => setNewField({ ...newField, key: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">Category</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                        value={newField.categoryId}
                                        onChange={e => setNewField({ ...newField, categoryId: e.target.value })}
                                    >
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <Button type="submit" className="w-full">Add Field</Button>
                                </div>
                            </form>
                        </div>

                        <div className="space-y-4">
                            {categories.map(cat => {
                                const catFields = fields.filter(f => f.categoryId === cat.id);
                                if (catFields.length === 0) return null;
                                return (
                                    <div key={cat.id} className="space-y-2">
                                        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{cat.name}</h4>
                                        <div className="grid gap-2 md:grid-cols-2">
                                            {catFields.map(field => (
                                                <div key={field.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{field.name}</p>
                                                        <p className="text-xs text-slate-500">Key: {field.key}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => {
                                                            const nextCatIdx = (categories.findIndex(c => c.id === cat.id) + 1) % categories.length;
                                                            updateField(field.id, { categoryId: categories[nextCatIdx].id });
                                                        }}>
                                                            <FolderPlus className="h-4 w-4 text-blue-500" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => removeField(field.id)}>
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* FEEDBACK TAB */}
            {activeTab === 'feedback' && (
                <div className="space-y-4">
                    {feedback.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No feedback yet.</p>
                    ) : (
                        <div className="grid gap-4">
                            {feedback.map((item) => (
                                <div key={item.id} className={cn("p-4 rounded-lg border", item.status === 'resolved' ? "bg-slate-50 border-slate-200" : "bg-white border-blue-200 shadow-sm")}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className={cn("text-xs font-bold px-2 py-1 rounded uppercase",
                                                item.type === 'bug' ? "bg-red-100 text-red-700" :
                                                    item.type === 'change_request' ? "bg-blue-100 text-blue-700" :
                                                        "bg-slate-100 text-slate-700"
                                            )}>
                                                {item.type.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs text-slate-500 ml-2">{new Date(item.date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {item.status !== 'resolved' && (
                                                <Button size="sm" variant="ghost" onClick={() => resolveFeedback(item.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                                                    <Check className="h-4 w-4 mr-1" /> Resolve
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost" onClick={() => deleteFeedback(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="font-medium text-slate-900">{item.name} <span className="font-normal text-slate-500">wrote:</span></p>
                                    <p className="text-slate-700 mt-1">{item.message}</p>
                                    {(item.sku || item.leg_number) && (
                                        <div className="flex gap-4 mt-2 text-sm text-slate-500">
                                            {item.sku && <p>Ref SKU: <span className="font-medium text-slate-700">{item.sku}</span></p>}
                                            {item.leg_number && <p>Leg: <span className="font-medium text-slate-700">{item.leg_number}</span></p>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* USERS TAB (Admin Only) */}
            {activeTab === 'users' && userRole === 'admin' && (
                <div className="space-y-4">
                    <div className="rounded-md border border-slate-200 bg-white overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 font-medium">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Joined</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-medium">
                                            {user.first_name || user.last_name
                                                ? `${user.first_name || ''} ${user.last_name || ''}`
                                                : <span className="text-slate-400 italic">No Name</span>}
                                        </td>
                                        <td className="p-4">{user.email}</td>
                                        <td className="p-4 capitalize">{user.role}</td>
                                        <td className="p-4">
                                            <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase",
                                                user.status === 'approved' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                            )}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td className="p-4 text-right space-x-2">
                                            {user.status === 'pending' && (
                                                <>
                                                    <Button size="sm" variant="ghost" onClick={() => updateUserStatus(user.id, 'approved')} className="text-green-600 hover:bg-green-50">
                                                        Approve
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => updateUserStatus(user.id, 'rejected')} className="text-red-600 hover:bg-red-50">
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* HISTORY TAB (Admin Only) */}
            {activeTab === 'history' && userRole === 'admin' && (
                <div className="space-y-4">
                    <div className="rounded-md border border-slate-200 bg-white overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 font-medium">
                                <tr>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">User</th>
                                    <th className="p-4">Action</th>
                                    <th className="p-4">Summary</th>
                                    <th className="p-4 text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-medium">{log.user_email}</td>
                                        <td className="p-4">
                                            <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase",
                                                log.action === 'create' ? "bg-green-100 text-green-700" :
                                                    log.action === 'delete' ? "bg-red-100 text-red-700" :
                                                        "bg-blue-100 text-blue-700"
                                            )}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {log.action === 'update' && log.details?.changes ? (
                                                <span>Updated {Object.keys(log.details.changes).length} field(s) for SKU {log.details?.sku || '?'}</span>
                                            ) : (
                                                <span>{log.action}d SKU {log.details?.sku || '?'}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => setViewingHistoryItem(log)}>
                                                View Details
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => deleteHistoryItem(log.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VOTES TAB (Admin Only) */}
            {activeTab === 'votes' && userRole === 'admin' && (
                <div className="space-y-4">
                    <div className="rounded-md border border-slate-200 bg-white overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 font-medium">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">User ID</th>
                                    <th className="p-4">Setting ID</th>
                                    <th className="p-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {votes.map((vote) => (
                                    <tr key={vote.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500 whitespace-nowrap">
                                            {new Date(vote.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-medium">
                                            {(() => {
                                                const user = users.find(u => u.id === vote.user_id);
                                                return user ? (
                                                    <div>
                                                        <p className="font-semibold">{user.first_name} {user.last_name}</p>
                                                        <p className="text-xs text-slate-500">{user.email}</p>
                                                    </div>
                                                ) : vote.user_id;
                                            })()}
                                        </td>
                                        <td className="p-4">
                                            {(() => {
                                                const setting = settings.find(s => s.id === vote.setting_id);
                                                return setting ? (
                                                    <span>Leg {setting.legNumber} - {setting.sku}</span>
                                                ) : vote.setting_id;
                                            })()}
                                        </td>
                                        <td className="p-4 text-green-600">Marked as Working</td>
                                    </tr>
                                ))}
                                {votes.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-slate-500">No votes recorded yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONFIG TAB (Admin Only) */}
            {activeTab === 'config' && userRole === 'admin' && (
                <div className="max-w-xl space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Application Configuration</h3>
                        <form onSubmit={handleSaveConfig} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Voting Period (Days)</label>
                                <p className="text-xs text-slate-500">How often can a user mark the same setting as working?</p>
                                <Input
                                    type="number"
                                    min="1"
                                    value={configForm.vote_period_days || ''}
                                    onChange={e => setConfigForm({ ...configForm, vote_period_days: e.target.value })}
                                />
                            </div>
                            <Button type="submit">Save Configuration</Button>
                        </form>
                    </div>
                </div>
            )}

            {/* HISTORY DETAILS MODAL */}
            <Modal
                isOpen={!!viewingHistoryItem}
                onClose={() => setViewingHistoryItem(null)}
                title="History Details"
                className="max-w-2xl"
            >
                {viewingHistoryItem && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <div>
                                <p className="text-sm text-slate-500">Action</p>
                                <p className="font-bold capitalize text-lg">{viewingHistoryItem.action}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-slate-500">Date</p>
                                <p className="font-medium">{new Date(viewingHistoryItem.created_at).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                            <p className="text-sm font-medium text-slate-700">User: <span className="font-normal">{viewingHistoryItem.user_email}</span></p>
                            <p className="text-sm font-medium text-slate-700">SKU: <span className="font-normal">{viewingHistoryItem.details?.sku || '-'}</span></p>
                            <p className="text-sm font-medium text-slate-700">Leg: <span className="font-normal">{viewingHistoryItem.details?.legNumber || '-'}</span></p>
                        </div>

                        {viewingHistoryItem.action === 'update' && viewingHistoryItem.details?.changes && (
                            <div className="space-y-2">
                                <h4 className="font-medium text-slate-900">Changes</h4>
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-700">
                                            <tr>
                                                <th className="p-2 text-left">Field</th>
                                                <th className="p-2 text-left text-red-600">Before</th>
                                                <th className="p-2 text-left text-green-600">After</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {Object.entries(viewingHistoryItem.details.changes).map(([key, change]) => (
                                                <tr key={key}>
                                                    <td className="p-2 font-medium text-slate-700">{key}</td>
                                                    <td className="p-2 text-red-600 bg-red-50">{String(change?.from ?? '-')}</td>
                                                    <td className="p-2 text-green-600 bg-green-50">{String(change?.to ?? '-')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {viewingHistoryItem.action !== 'update' && (
                            <div className="space-y-2">
                                <h4 className="font-medium text-slate-900">Raw Data</h4>
                                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs">
                                    {JSON.stringify(viewingHistoryItem.details, null, 2)}
                                </pre>
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button onClick={() => setViewingHistoryItem(null)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* SETTING MODAL */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? "Edit Setting" : "Add New Setting"}
                className="max-w-4xl"
            >
                <form onSubmit={saveSetting} className="space-y-6">
                    <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">SKU</label>
                            <Input
                                required
                                value={settingForm.sku || ''}
                                onChange={e => setSettingForm({ ...settingForm, sku: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Case Size</label>
                            <Input
                                value={settingForm.caseSize || ''}
                                onChange={e => setSettingForm({ ...settingForm, caseSize: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Leg Number</label>
                            <Input
                                value={settingForm.legNumber || ''}
                                onChange={e => setSettingForm({ ...settingForm, legNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <Tabs
                            tabs={categories.map(c => ({ id: c.id, label: c.name }))}
                            activeTab={activeCategoryTab}
                            onTabChange={setActiveCategoryTab}
                            className="mb-4"
                        />

                        <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                            {fields
                                .filter(f => f.categoryId === activeCategoryTab)
                                .map(field => (
                                    <div key={field.id} className="space-y-2">
                                        <label className="text-sm font-medium">{field.name}</label>
                                        <Input
                                            type={field.type === 'number' ? 'number' : 'text'}
                                            value={settingForm[field.key] || ''}
                                            onChange={e => setSettingForm({ ...settingForm, [field.key]: e.target.value })}
                                        />
                                    </div>
                                ))
                            }
                            {fields.filter(f => f.categoryId === activeCategoryTab).length === 0 && (
                                <p className="col-span-2 text-center text-slate-400 py-8">No fields in this category.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Setting</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
