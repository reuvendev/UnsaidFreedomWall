'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SLU_SCHOOLS = [
  { 
    id: 'samcis', 
    name: 'SAMCIS', 
    fullName: 'School of Accountancy, Management, Computing and Information Studies', 
    campus: 'Maryheights Campus (Bakakeng)' 
  },
  { 
    id: 'sea', 
    name: 'SEA', 
    fullName: 'School of Engineering and Architecture', 
    campus: 'Main Campus' 
  },
  { 
    id: 'som', 
    name: 'SOM', 
    fullName: 'School of Medicine', 
    campus: 'Main Campus' 
  },
  { 
    id: 'sonahbs', 
    name: 'SONAHBS', 
    fullName: 'School of Nursing, Allied Health and Biological Sciences', 
    campus: 'Main Campus' 
  },
  { 
    id: 'stela', 
    name: 'STELA', 
    fullName: 'School of Teacher Education and Liberal Arts', 
    campus: 'Main Campus' 
  },
];

export default function ChatSetupPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [selectedSchool, setSelectedSchool] = useState(SLU_SCHOOLS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      alert('Please enter a valid nickname.');
      return;
    }

    setIsSubmitting(true);

    try {
      localStorage.setItem('unsaid_chat_nickname', nickname.trim());
      localStorage.setItem('unsaid_chat_school', selectedSchool);
      
      router.push('/chat/queue');
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 text-neutral-900 font-sans flex flex-col justify-between selection:bg-neutral-900 selection:text-white">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter hover:opacity-70 transition-opacity">
            TAMBAYAN<span className="text-emerald-600">.</span>
          </Link>
          <span className="font-mono text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
            1:1 Setup
          </span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12 w-full flex-1">
        <div className="mb-8">
          <p className="font-mono text-[11px] font-bold text-emerald-600 tracking-widest uppercase mb-2">
            Anonymous Matchmaking
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 mb-3">
            Choose your profile
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed font-mono">
            Set up how other Louisian students will see you during your anonymous 1:1 conversations.
          </p>
        </div>

        <form onSubmit={handleStartChat} className="space-y-8">
          {/* Nickname Selection */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-neutral-700">
              Anonymous Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. SilentLouisian_42"
              maxLength={25}
              required
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-all"
            />
          </div>

          {/* School Selection */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-neutral-700">
              Select Your SLU School
            </label>
            <div className="space-y-3">
              {SLU_SCHOOLS.map((school) => {
                const isSelected = selectedSchool === school.id;
                return (
                  <div
                    key={school.id}
                    onClick={() => setSelectedSchool(school.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected 
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm' 
                        : 'border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100/80 text-neutral-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="slu_school"
                      value={school.id}
                      checked={isSelected}
                      onChange={() => setSelectedSchool(school.id)}
                      className="mt-1 accent-emerald-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs font-bold">
                        <span>{school.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${isSelected ? 'bg-neutral-800 text-emerald-400' : 'bg-neutral-200 text-neutral-700'}`}>
                          {school.campus}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {school.fullName}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Entering Queue...' : 'Find Chatmate Now ⚡'}
          </button>
        </form>
      </main>
    </div>
  );
}