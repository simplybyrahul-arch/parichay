"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const AnalyticsCharts = ({ projectData, paymentData }: { projectData: any[], paymentData: any[] }) => {
    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <h3 className="font-bold text-stone-900 mb-6">Projects Over Time</h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={projectData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#78716C', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#78716C', fontSize: 12}} dx={-10} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: '1px solid #E7E5E4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line type="monotone" dataKey="count" stroke="#EA580C" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <h3 className="font-bold text-stone-900 mb-6">Escrow Volume (INR)</h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#78716C', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#78716C', fontSize: 12}} dx={-10} tickFormatter={(value) => `₹${value}`} />
                            <Tooltip 
                                formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Volume']}
                                contentStyle={{ borderRadius: '12px', border: '1px solid #E7E5E4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
