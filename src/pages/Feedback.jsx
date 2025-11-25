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
    const { addFeedback } = useData();
    const initialSku = searchParams.get('sku') || '';

    const [formData, setFormData] = useState({
        name: '',
        type: initialSku ? 'change_request' : 'general',
        sku: initialSku,
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        addFeedback(formData);
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
        <div className="max-w-md mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Submit Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                            </select>
                        </div>

                        {formData.type === 'change_request' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Related SKU</label>
                                <Input
                                    value={formData.sku}
                                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                    placeholder="12345"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Message</label>
                            <textarea
                                required
                                className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                placeholder="Describe your feedback or request..."
                            />
                        </div>

                        <Button type="submit" className="w-full">Submit Feedback</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
