import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { CheckCircle2 } from 'lucide-react';

export const Feedback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { addFeedback, fields, categories } = useData();
    const initialSku = searchParams.get('sku') || '';

    const [formData, setFormData] = useState({
        name: '',
        type: initialSku ? 'change_request' : 'general',
        sku: initialSku,
        message: ''
    });

    // State for New Product Request dynamic fields
    const [newProductData, setNewProductData] = useState({});

    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        let finalMessage = formData.message;

        // If New Product, format the data into the message
        if (formData.type === 'new_product') {
            const fieldData = Object.entries(newProductData)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');

            finalMessage = `REQUEST: NEW PRODUCT\n\n${fieldData}\n\nAdditional Notes:\n${formData.message}`;
        }

        addFeedback({
            ...formData,
            message: finalMessage
        });

        setSubmitted(true);
        setTimeout(() => {
            navigate('/');
        }, 2000);
    };

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Feedback Submitted!</h2>
                <p className="text-slate-600">Thank you for your input. Redirecting...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Submit Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Your Name</label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Type</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="general">General Feedback</option>
                                    <option value="change_request">Change Request</option>
                                    <option value="bug">Report a Bug</option>
                                    <option value="new_product">New Product Request</option>
                                </select>
                            </div>
                        </div>

                        {/* Standard SKU & Leg Input for Change Request */}
                        {formData.type === 'change_request' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Related SKU</label>
                                    <Input
                                        value={formData.sku}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        placeholder="12345"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Leg Number</label>
                                    <Input
                                        value={formData.legNumber || ''}
                                        onChange={e => setFormData({ ...formData, legNumber: e.target.value })}
                                        placeholder="e.g. 8"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Dynamic Fields for New Product Request */}
                        {formData.type === 'new_product' && (
                            <div className="space-y-6 border-t border-b border-slate-100 py-6">
                                <h3 className="font-semibold text-slate-900">Product Details</h3>

                                {/* Standard Fields */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">SKU</label>
                                        <Input
                                            required
                                            onChange={e => setNewProductData({ ...newProductData, SKU: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Leg Number</label>
                                        <Input
                                            required
                                            onChange={e => setNewProductData({ ...newProductData, 'Leg Number': e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Case Size</label>
                                        <Input
                                            required
                                            onChange={e => setNewProductData({ ...newProductData, 'Case Size': e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Program</label>
                                        <Input
                                            required
                                            onChange={e => setNewProductData({ ...newProductData, Program: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Fields by Category */}
                                {categories.map(cat => {
                                    const catFields = fields.filter(f => f.categoryId === cat.id);
                                    if (catFields.length === 0) return null;

                                    return (
                                        <div key={cat.id} className="space-y-4">
                                            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">{cat.name}</h4>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {catFields.map(field => (
                                                    <div key={field.id} className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">{field.name}</label>
                                                        <Input
                                                            type={field.type === 'number' ? 'number' : 'text'}
                                                            onChange={e => setNewProductData({
                                                                ...newProductData,
                                                                [field.name]: e.target.value
                                                            })}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                                {formData.type === 'new_product' ? 'Additional Notes' : 'Message'}
                            </label>
                            <textarea
                                required={formData.type !== 'new_product'}
                                className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                placeholder={formData.type === 'new_product' ? "Any extra details..." : "Describe your feedback or request..."}
                            />
                        </div>

                        <Button type="submit" className="w-full">Submit Feedback</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
