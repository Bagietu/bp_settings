import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export const Tabs = ({ tabs, activeTab, onTabChange, className }) => {
    return (
        <div className={cn("flex space-x-1 border-b border-slate-200", className)}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeTab === tab.id
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
