import React, { useState, useMemo } from 'react';
import { Search, ArrowRight, Eye, ChevronRight, Package, FileText, CheckCircle, ThumbsUp, ArrowUpDown, AlertCircle, Info } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { Link, useNavigate } from 'react-router-dom';

export const Home = () => {
    const {
        settings, fields, categories, addVote, votes, user,
        legSearch, setLegSearch,
        skuSearch, setSkuSearch,
        selectedCaseSize, setSelectedCaseSize,
        resetSearch
    } = useData();
    const navigate = useNavigate();

    // Search State (Moved to Context)
    const [sortOption, setSortOption] = useState('sku'); // 'sku', 'last_change', 'last_worked'

    // Modal State
    const [selectedSettingDetails, setSelectedSettingDetails] = useState(null);
    const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '');

    // Status Modal State
    const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success', message: '' });

    // Derived Data
    const availableCaseSizes = useMemo(() => {
        if (!legSearch) return [];
        const legSettings = settings.filter(s => s.legNumber === legSearch);
        return [...new Set(legSettings.map(s => s.caseSize))].filter(Boolean).sort();
    }, [legSearch, settings]);

    const filteredSkus = useMemo(() => {
        if (!legSearch) return [];

        // Base filter: Leg Number
        let skus = settings.filter(s => s.legNumber === legSearch);

        // Secondary Filter: SKU Search OR Case Size
        if (skuSearch) {
            // If user is typing, filter by SKU (ignore case size)
            skus = skus.filter(s => s.sku.toLowerCase().includes(skuSearch.toLowerCase()));
        } else if (selectedCaseSize) {
            // If no typing, filter by selected Case Size
            skus = skus.filter(s => s.caseSize === selectedCaseSize);
        } else {
            // If neither, return empty (show case sizes instead)
            return [];
        }

        // Calculate Last Worked for sorting
        skus = skus.map(s => {
            const settingVotes = votes.filter(v => v.setting_id === s.id);
            const lastWorked = settingVotes.length > 0
                ? new Date(Math.max(...settingVotes.map(v => new Date(v.created_at))))
                : null;
            return { ...s, lastWorked };
        });

        // Sorting
        return skus.sort((a, b) => {
            if (sortOption === 'sku') return a.sku.localeCompare(b.sku);
            if (sortOption === 'last_change') return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
            if (sortOption === 'last_worked') return (b.lastWorked || 0) - (a.lastWorked || 0);
            return 0;
        });
    }, [legSearch, selectedCaseSize, skuSearch, settings, votes, sortOption]);

    const handleLegChange = (e) => {
        setLegSearch(e.target.value);
        setSelectedCaseSize(null);
        setSkuSearch('');
    };

    const handleVote = async (settingId) => {
        const result = await addVote(settingId);
        if (result.success) {
            setStatusModal({ isOpen: true, type: 'success', message: result.message });
        } else {
            // Determine type based on message content for better UX
            let type = 'error';
            if (result.message.includes("Login required")) type = 'info';
            if (result.message.includes("already voted")) type = 'warning';

            setStatusModal({ isOpen: true, type, message: result.message });
        }
    };

    return (
        <div className="space-y-8 relative">

            <div className="text-center space-y-4 py-8 mt-8">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                    Blueprint Settings
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Select a Leg, then Case Size OR start typing to find your SKU.
                </p>
            </div>

            {/* Leg Selection */}
            <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Select Leg Number</label>
                <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    value={legSearch}
                    onChange={handleLegChange}
                >
                    <option value="">Select Leg</option>
                    <optgroup label="CP 26">
                        <option value="4">Leg 4</option>
                        <option value="5">Leg 5</option>
                        <option value="6">Leg 6</option>
                    </optgroup>
                    <optgroup label="CP 27">
                        <option value="7">Leg 7</option>
                        <option value="8">Leg 8</option>
                        <option value="9">Leg 9</option>
                    </optgroup>
                    <optgroup label="CP 30">
                        <option value="18">Leg 18</option>
                        <option value="17">Leg 17</option>
                        <option value="16">Leg 16</option>
                    </optgroup>
                    <optgroup label="CP 31">
                        <option value="15">Leg 15</option>
                        <option value="14">Leg 14</option>
                        <option value="13">Leg 13</option>
                    </optgroup>
                    <optgroup label="CP 23">
                        <option value="12">Leg 12</option>
                        <option value="11">Leg 11</option>
                        <option value="10">Leg 10</option>
                    </optgroup>
                    <optgroup label="CP 22">
                        <option value="3">Leg 3</option>
                        <option value="2">Leg 2</option>
                        <option value="1">Leg 1</option>
                    </optgroup>
                </select>
            </div>

            {/* Main Content Area */}
            {legSearch && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Type SKU to search..."
                                className="pl-10 bg-white w-full"
                                value={skuSearch}
                                onChange={(e) => setSkuSearch(e.target.value)}
                            />
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetSearch}
                            className="text-slate-500 hover:text-slate-700"
                        >
                            Reset Search
                        </Button>

                        {/* Only show sorting if we are displaying SKUs */}
                        {(skuSearch || selectedCaseSize) && filteredSkus.length > 0 && (
                            <div className="flex items-center gap-2">
                                <ArrowUpDown className="h-4 w-4 text-slate-500" />
                                <select
                                    className="flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value)}
                                >
                                    <option value="sku">Sort by SKU</option>
                                    <option value="last_change">Sort by Last Change</option>
                                    <option value="last_worked">Sort by Last Worked</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Logic Branching */}

                    {/* Case Sizes - Show if:
                        1. No Case Size Selected AND
                        2. (No Search Active OR No Search Results)
                    */}
                    {!selectedCaseSize && (!skuSearch || filteredSkus.length === 0) && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 text-center">
                                {skuSearch ? "No matching SKUs. Select Case Size:" : "Select Case Size"}
                            </h3>
                            {availableCaseSizes.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {availableCaseSizes.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => {
                                                setSelectedCaseSize(size);
                                                setSkuSearch(''); // Clear SKU search on selection
                                            }}
                                            className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
                                        >
                                            <Package className="h-8 w-8 text-slate-400 group-hover:text-blue-500 mb-2" />
                                            <span className="font-medium text-lg text-slate-700 group-hover:text-blue-600">{size}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-slate-500 italic">No settings found for this leg.</p>
                            )}
                        </div>
                    )}

                    {/* SKUs - Show if:
                        1. Search Active OR Case Size Selected
                    */}
                    {(skuSearch || selectedCaseSize) && (
                        <div className="space-y-4">
                            {/* Breadcrumbs / Context */}
                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 justify-center">
                                <span className="font-medium text-slate-900">Leg {legSearch}</span>
                                {selectedCaseSize && !skuSearch && (
                                    <>
                                        <ChevronRight className="h-3 w-3" />
                                        <button onClick={() => setSelectedCaseSize(null)} className="hover:underline">Case Sizes</button>
                                        <ChevronRight className="h-3 w-3" />
                                        <span className="font-medium text-slate-900">{selectedCaseSize}</span>
                                    </>
                                )}
                                {skuSearch && (
                                    <>
                                        <ChevronRight className="h-3 w-3" />
                                        <span className="font-medium text-slate-900">Searching "{skuSearch}"</span>
                                    </>
                                )}
                            </div>

                            {/* SKU Grid */}
                            {filteredSkus.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredSkus.map(setting => (
                                        <Card
                                            key={setting.id}
                                            className="hover:shadow-md transition-all cursor-pointer border-slate-200 hover:border-blue-400 group"
                                            onClick={() => {
                                                setSelectedSettingDetails(setting);
                                                setActiveCategory(categories[0]?.id);
                                            }}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-blue-50 p-2 rounded-lg">
                                                            <FileText className="h-5 w-5 text-blue-500" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-lg">{setting.sku}</h4>
                                                            <p className="text-xs text-slate-500">Case: {setting.caseSize}</p>
                                                            <p className="text-xs text-slate-500">Last Change: {setting.lastUpdated ? new Date(setting.lastUpdated).toLocaleDateString() : '-'}</p>
                                                        </div>
                                                    </div>
                                                    {setting.lastWorked && (
                                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                                            <CheckCircle className="h-3 w-3" />
                                                            Worked: {setting.lastWorked.toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-slate-500 font-medium">No SKUs found matching "{skuSearch}".</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Details Modal */}
            <Modal
                isOpen={!!selectedSettingDetails}
                onClose={() => setSelectedSettingDetails(null)}
                title={selectedSettingDetails ? `Settings for SKU: ${selectedSettingDetails.sku}` : ''}
                className="max-w-3xl"
            >
                {selectedSettingDetails && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Leg Number</span>
                                <p className="font-semibold text-lg">{selectedSettingDetails.legNumber}</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Case Size</span>
                                <p className="font-semibold text-lg">{selectedSettingDetails.caseSize}</p>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Last Worked</span>
                                <p className="font-semibold text-lg text-green-600">
                                    {selectedSettingDetails.lastWorked ? selectedSettingDetails.lastWorked.toLocaleDateString() : 'Never'}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleVote(selectedSettingDetails.id)}
                                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                            >
                                <ThumbsUp className="h-4 w-4" /> Mark as Working
                            </Button>
                            <Link to={`/feedback?sku=${selectedSettingDetails.sku}&leg=${selectedSettingDetails.legNumber}`} className="flex-1">
                                <Button variant="outline" className="w-full gap-2">
                                    Request Change
                                </Button>
                            </Link>
                        </div>

                        <div>
                            <Tabs
                                tabs={categories.map(c => ({ id: c.id, label: c.name }))}
                                activeTab={activeCategory}
                                onTabChange={setActiveCategory}
                                className="mb-4"
                            />

                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                {fields
                                    .filter(f => f.categoryId === activeCategory)
                                    .map(field => (
                                        <div key={field.id} className="flex justify-between items-center border-b border-slate-100 pb-2">
                                            <span className="text-slate-600">{field.name}</span>
                                            <span className="font-medium">{selectedSettingDetails[field.key] || '-'}</span>
                                        </div>
                                    ))
                                }
                                {fields.filter(f => f.categoryId === activeCategory).length === 0 && (
                                    <p className="col-span-2 text-center text-slate-400 py-4">No fields in this category.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Status Modal (Success/Error/Warning) */}
            <Modal
                isOpen={statusModal.isOpen}
                onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
                title={statusModal.type === 'success' ? 'Success' : statusModal.type === 'error' ? 'Error' : 'Notice'}
                className="max-w-sm"
            >
                <div className="text-center space-y-4 py-4">
                    <div className="flex justify-center">
                        <div className={`p-3 rounded-full ${statusModal.type === 'success' ? 'bg-green-100' :
                            statusModal.type === 'error' ? 'bg-red-100' : 'bg-amber-100'
                            }`}>
                            {statusModal.type === 'success' && <CheckCircle className="h-8 w-8 text-green-600" />}
                            {statusModal.type === 'error' && <AlertCircle className="h-8 w-8 text-red-600" />}
                            {statusModal.type === 'warning' && <AlertCircle className="h-8 w-8 text-amber-600" />}
                            {statusModal.type === 'info' && <Info className="h-8 w-8 text-blue-600" />}
                        </div>
                    </div>
                    <p className="text-lg font-medium text-slate-900">{statusModal.message}</p>
                    <Button
                        onClick={() => setStatusModal({ ...statusModal, isOpen: false })}
                        className={`w-full ${statusModal.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                            statusModal.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                                'bg-slate-900 hover:bg-slate-800'
                            }`}
                    >
                        OK
                    </Button>
                </div>
            </Modal>
        </div>
    );
};
