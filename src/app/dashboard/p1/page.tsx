"use client";

import { useState } from "react";
import {
    ArrowLeft,
    MoreVertical,
    CheckCircle2,
    Circle,
    Clock,
    MessageSquare,
    FileText,
    Download,
    Send,
    ShieldCheck,
    AlertCircle,
    Paperclip
} from "lucide-react";

// Mock Project Data
const projectData = {
    id: "p1",
    title: "Nike Air Max Commercial",
    creator: {
        name: "Arjun Mehta",
        role: "Director of Photography",
        image: "https://images.unsplash.com/photo-1542385262-cea6e8a4bb2a?w=100&q=80"
    },
    status: "in-progress", // "planning", "in-progress", "review", "completed"
    financials: {
        total: 120000,
        paid: 40000,
        inEscrow: 40000,
        remaining: 40000
    },
    milestones: [
        { id: 1, title: "Project Kickoff & Moodboard Approval", status: "completed", date: "Nov 12", amount: 40000 },
        { id: 2, title: "Principal Photography (2 Days)", status: "completed", date: "Nov 15", amount: 40000 },
        { id: 3, title: "First Cut Review", status: "active", date: "Nov 20", amount: 20000 },
        { id: 4, title: "Final Delivery & Handoff", status: "pending", date: "Nov 25", amount: 20000 },
    ],
    messages: [
        { id: 1, sender: "creator", text: "Hey! Just uploaded the moodboard for the lighting setups. Let me know what you think of the cyberpunk aesthetic for the night shots.", time: "Nov 11, 10:30 AM", type: "text" },
        { id: 2, sender: "client", text: "Looks incredible. Exactly the vibe we want. Approved!", time: "Nov 12, 09:15 AM", type: "text" },
        { id: 3, sender: "system", text: "Milestone 1 Approved. ₹40,000 released from Escrow.", time: "Nov 12, 09:16 AM", type: "system" },
        { id: 4, sender: "creator", text: "Wrapped up day 2 of shooting! Getting the footage ingested now. I'll have the first cut ready by Thursday.", time: "Nov 15, 08:45 PM", type: "text" },
        { id: 5, sender: "system", text: "Milestone 2 Approved. ₹40,000 released from Escrow.", time: "Nov 16, 10:00 AM", type: "system" },
        { id: 6, sender: "creator", text: "First cut is ready for your review!", time: "Today, 11:30 AM", type: "attachment", fileName: "Nike_AirMax_v1.mp4", fileSize: "1.2 GB" },
    ]
};

export default function ProjectWorkspace() {
    const [newMessage, setNewMessage] = useState("");
    const [fundsReleased, setFundsReleased] = useState(false);

    const handleReleaseFunds = () => {
        setFundsReleased(true);
        // In a real app, this would trigger an API call.
    };

    return (
        <div className="min-h-screen bg-[#fdfbfb] flex flex-col font-sans selection:bg-orange-500/30">
            {/* Header Navigation */}
            <header className="h-20 bg-white/80 backdrop-blur-md border-b border-stone-100 flex items-center justify-between px-6 sticky top-0 z-20">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="p-2 -ml-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm font-bold hidden sm:inline-block">Back to Dashboard</span>
                    </button>
                    <div className="h-8 w-px bg-stone-200 hidden sm:block"></div>
                    <div>
                        <h1 className="text-xl font-black text-stone-900 font-display tracking-tight">{projectData.title}</h1>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">{projectData.id} • Active Workspace</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-bold text-green-700">Escrow Protected</span>
                    </div>
                    <button className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Workspace Content */}
            <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 gap-8">

                {/* Left Column: Project Status & Escrow */}
                <div className="w-full lg:w-[45%] flex flex-col gap-6">

                    {/* Creator Context Card */}
                    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm flex items-center gap-4">
                        <img src={projectData.creator.image} alt={projectData.creator.name} className="w-16 h-16 rounded-full object-cover border border-stone-100" />
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-stone-900">{projectData.creator.name}</h2>
                            <p className="text-sm text-stone-500">{projectData.creator.role}</p>
                        </div>
                        <button
                            onClick={() => window.location.href = '/creators/c1'}
                            className="px-4 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-full hover:bg-stone-50 transition-colors"
                        >
                            View Profile
                        </button>
                    </div>

                    {/* Financial Overview */}
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-stone-200 shadow-sm">
                        <h3 className="text-base font-bold text-stone-900 mb-6 flex items-center justify-between">
                            Financial Overview
                            <span className="text-sm font-medium text-stone-500">Total: ₹{projectData.financials.total.toLocaleString()}</span>
                        </h3>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                <div className="text-xs font-semibold text-stone-500 mb-1">Total Paid</div>
                                <div className="text-xl font-black text-stone-900">₹{projectData.financials.paid.toLocaleString()}</div>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 relative overflow-hidden">
                                <ShieldCheck className="absolute -right-4 -bottom-4 w-20 h-20 text-orange-500/10" />
                                <div className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1">
                                    In Escrow
                                </div>
                                <div className="text-xl font-black text-orange-900 relative z-10">₹{projectData.financials.inEscrow.toLocaleString()}</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mb-2 flex">
                            <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: '33%' }}></div>
                            <div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: '33%' }}></div>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-stone-400">
                            <span>Paid (33%)</span>
                            <span>Escrow Locked (33%)</span>
                            <span>Remaining (33%)</span>
                        </div>
                    </div>

                    {/* Interactive Milestone Timeline */}
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-stone-200 shadow-sm flex-1">
                        <h3 className="text-base font-bold text-stone-900 mb-8">Project Milestones</h3>

                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-stone-200 before:to-transparent">
                            {projectData.milestones.map((milestone, idx) => (
                                <div key={milestone.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    {/* Timeline dot */}
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${milestone.status === 'completed' ? 'bg-green-500 text-white' :
                                        milestone.status === 'active' ? 'bg-orange-500 text-white shadow-orange-500/30' :
                                            'bg-stone-200 text-stone-400'
                                        }`}>
                                        {milestone.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                                            milestone.status === 'active' ? <Clock className="w-4 h-4" /> :
                                                <Circle className="w-3 h-3" />}
                                    </div>

                                    {/* Card */}
                                    <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border ${milestone.status === 'active' ? 'border-orange-200 bg-orange-50 shadow-sm' : 'border-stone-100 bg-white'
                                        }`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${milestone.status === 'completed' ? 'text-green-600' :
                                                milestone.status === 'active' ? 'text-orange-600' : 'text-stone-400'
                                                }`}>
                                                {milestone.status}
                                            </span>
                                            <span className="text-xs font-semibold text-stone-400">{milestone.date}</span>
                                        </div>
                                        <h4 className={`text-sm font-bold leading-snug mb-2 ${milestone.status === 'pending' ? 'text-stone-400' : 'text-stone-900'}`}>
                                            {milestone.title}
                                        </h4>
                                        <div className="text-xs font-bold text-stone-500 flex items-center justify-between">
                                            <span>Amount: ₹{milestone.amount.toLocaleString()}</span>
                                            {milestone.status === 'active' && (
                                                <button
                                                    disabled={fundsReleased}
                                                    onClick={handleReleaseFunds}
                                                    className={`px-3 py-1.5 rounded-lg transition-colors ${fundsReleased
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm shadow-orange-500/20'
                                                        }`}
                                                >
                                                    {fundsReleased ? 'Funds Released' : 'Release Escrow'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Contextual Chat Interface */}
                <div className="w-full lg:w-[55%] bg-white rounded-[2rem] border border-stone-200 shadow-sm flex flex-col h-[800px] lg:h-auto overflow-hidden relative">

                    {/* Chat Header */}
                    <div className="p-4 sm:p-6 border-b border-stone-100 bg-white z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-stone-900">Project Workspace</h3>
                                <p className="text-xs text-stone-500 font-medium">Synced with Arjun Mehta</p>
                            </div>
                        </div>
                    </div>

                    {/* Chat Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-stone-50/50">
                        {projectData.messages.map((msg, idx) => (
                            <div key={msg.id} className={`flex flex-col ${msg.sender === 'client' ? 'items-end' : msg.sender === 'system' ? 'items-center' : 'items-start'}`}>

                                {msg.sender === 'system' ? (
                                    <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-green-100 my-2">
                                        <ShieldCheck className="w-4 h-4" /> {msg.text}
                                    </div>
                                ) : (
                                    <div className={`flex flex-col ${msg.sender === 'client' ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                                        <div className={`rounded-2xl p-4 w-full ${msg.sender === 'client'
                                            ? 'bg-stone-900 text-white rounded-br-none'
                                            : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none shadow-sm'
                                            }`}>
                                            {msg.type === 'text' && (
                                                <p className="text-sm leading-relaxed">{msg.text}</p>
                                            )}

                                            {msg.type === 'attachment' && (
                                                <div>
                                                    <p className="text-sm leading-relaxed mb-3">{msg.text}</p>
                                                    <div className="flex items-center gap-3 bg-stone-50 border border-stone-100 p-3 rounded-xl hover:bg-stone-100 cursor-pointer transition-colors group">
                                                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-stone-900 truncate">{msg.fileName}</p>
                                                            <p className="text-xs text-stone-500">{msg.fileSize}</p>
                                                        </div>
                                                        <Download className="w-5 h-5 text-stone-400 group-hover:text-stone-900 transition-colors" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-stone-400 mt-1.5 px-1">{msg.time}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Chat Input Area */}
                    <div className="p-4 border-t border-stone-100 bg-white">
                        <div className="flex items-end gap-2 bg-stone-50 border border-stone-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
                            <button className="p-3 text-stone-400 hover:text-stone-900 transition-colors rounded-xl hover:bg-stone-200 shrink-0">
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message or drop files..."
                                className="flex-1 bg-transparent border-none text-sm text-stone-900 focus:ring-0 resize-none max-h-32 py-3 px-2 min-h-[48px]"
                                rows={1}
                            />
                            <button
                                className={`p-3 rounded-xl shrink-0 transition-colors ${newMessage.trim() ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-md shadow-orange-500/20' : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                    }`}
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
