import React, { useState } from 'react';
import { Search, ArrowRight, Eye, ChevronRight, Package, FileText } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { Link } from 'react-router-dom';

export const Home = () => {
    const { settings, fields, categories } = useData();

    // Search State
    const [legSearch, setLegSearch] = useState('');
    const [skuSearch, setSkuSearch] = useState('');

    // UI State
    const [searchResult, setSearchResult] = useState(null); // 'found', 'not_found', null
    const [foundSetting, setFoundSetting] = useState(null);
    const [availableCaseSizes, setAvailableCaseSizes] = useState([]);
    const [selectedCaseSize, setSelectedCaseSize] = useState(null);
    const [availableSkus, setAvailableSkus] = useState([]);

    // Modal State
    const [selectedSettingDetails, setSelectedSettingDetails] = useState(null);
    const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '');

    const handleSearch = () => {
        if (!legSearch || !skuSearch) return;

        // Reset intermediate states
        setSearchResult(null);
        setFoundSetting(null);
        setAvailableCaseSizes([]);
        setSelectedCaseSize(null);
        setAvailableSkus([]);

        // 1. Try to find exact match
        const match = settings.find(s =>
            s.legNumber === legSearch &&
            s.sku.toLowerCase() === skuSearch.toLowerCase()
        );

        if (match) {
            setFoundSetting(match);
            setSearchResult('found');
        } else {
            // 2. Not found - Find available case sizes for this leg
            const legSettings = settings.filter(s => s.legNumber === legSearch);
            const uniqueCaseSizes = [...new Set(legSettings.map(s => s.caseSize))].filter(Boolean);

            setAvailableCaseSizes(uniqueCaseSizes);
            setSearchResult('not_found');
        }
    };

    const handleCaseSizeClick = (caseSize) => {
        setSelectedCaseSize(caseSize);
        // Find SKUs for this Leg + Case Size
        const skus = settings
            .filter(s => s.legNumber === legSearch && s.caseSize === caseSize)
            .map(s => s.sku);
        setAvailableSkus(skus);
    };

    const handleSkuClick = (sku) => {
        const match = settings.find(s =>
            s.legNumber === legSearch &&
            s.sku === sku
        );
        if (match) {
            setFoundSetting(match);
            setSearchResult('found');
        }
    };

    const handleViewDetails = (setting) => {
        setSelectedSettingDetails(setting);
        setActiveCategory(categories[0]?.id);
    };

    return (
        <div className="space-y-8">
            <div className="text-center space-y-4 py-8">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                    Blueprint Settings
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Search by Leg Number and SKU.
                </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Leg Number</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            value={legSearch}
                            onChange={(e) => setLegSearch(e.target.value)}
                        >
                            <option value="">Select</option>
                            {[...Array(10)].map((_, i) => (
                                <option key={i + 1} value={(i + 1).toString()}>Leg {i + 1}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-slate-700 mb-1 block">SKU</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Enter SKU..."
                                className="pl-10"
                                value={skuSearch}
                                onChange={(e) => setSkuSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <Button className="w-full" onClick={handleSearch} disabled={!legSearch || !skuSearch}>
                            Search
                        </Button>
                    </div>
                </div>
            </div>

            {/* Results Area */}
            <div className="max-w-4xl mx-auto">

                {/* Case 1: Found Exact Match */}
                {searchResult === 'found' && foundSetting && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="hover:shadow-md transition-shadow border-green-200 bg-green-50/30">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <span>SKU: {foundSetting.sku}</span>
                                    </div>
                                    <span className="text-sm font-normal text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                        Leg {foundSetting.legNumber}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Case Size</span>
                                    <span className="font-medium">{foundSetting.caseSize}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Program</span>
                                    <span className="font-medium">{foundSetting.program}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="gap-2">
                                <Button variant="secondary" className="flex-1 gap-2" onClick={() => handleViewDetails(foundSetting)}>
                                    <Eye className="h-4 w-4" /> View Details
                                </Button>
                                <Link to={`/feedback?sku=${foundSetting.sku}`} className="flex-1">
                                    <Button variant="ghost" className="w-full gap-2">
                                        Request Change
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* Case 2: Not Found - Show Fallback Flow */}
                {searchResult === 'not_found' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 flex items-start gap-3">
                            <div className="mt-1"><Package className="h-5 w-5" /></div>
                            <div>
                                <p className="font-medium">No settings found for SKU "{skuSearch}" on Leg {legSearch}.</p>
                                <p className="text-sm mt-1 opacity-90">Please select a Case Size below to see available SKUs for this leg.</p>
                            </div>
                        </div>

                        {/* Step 1: Select Case Size */}
                        {!selectedCaseSize && (
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold text-slate-900">Available Case Sizes for Leg {legSearch}</h3>
                                {availableCaseSizes.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {availableCaseSizes.map(size => (
                                            <button
                                                key={size}
                                                onClick={() => handleCaseSizeClick(size)}
                                                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-left group"
                                            >
                                                <span className="font-medium text-slate-700 group-hover:text-blue-600">{size}</span>
                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">No case sizes recorded for this leg yet.</p>
                                )}
                            </div>
                        )}

                        {/* Step 2: Select SKU */}
                        {selectedCaseSize && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <button onClick={() => setSelectedCaseSize(null)} className="hover:underline">Case Sizes</button>
                                    <ChevronRight className="h-3 w-3" />
                                    <span className="font-medium text-slate-900">{selectedCaseSize}</span>
                                </div>

                                <h3 className="text-lg font-semibold text-slate-900">Available SKUs</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {availableSkus.map(sku => (
                                        <button
                                            key={sku}
                                            onClick={() => handleSkuClick(sku)}
                                            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-left group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                                                <span className="font-medium text-slate-700 group-hover:text-blue-600">{sku}</span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>

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
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Program</span>
                                <p className="font-semibold text-lg">{selectedSettingDetails.program}</p>
                            </div>
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
        </div>
    );
};

// Helper Icon
const CheckCircle = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
