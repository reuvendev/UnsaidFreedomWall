'use client';

import React, { useState, useEffect } from 'react';
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

// Comprehensive bad word / racist term list (English & Tagalog, roots & common variations)
const BANNED_WORDS = [
  // English Profanity & Slurs
  'gook', 'nigger', 'nigga', 'fag', 'faggot', 'retard', 'tranny', 'chink', 'spic', 
  'whore', 'slut', 'bitch', 'bastard', 'cunt', 'dick', 'cock', 'pussy', 'asshole', 'motherfucker',
  
  // Tagalog / Filipino Profanity & Slurs
  'gago', 'g@g0', 'g4g0', 'putangina', 'tangina', 'puta', 'pota', 'putang', 'tanga', 't@ng@', 
  'bobo', 'b0b0', 'ulol', 'olul', 'hayop', 'inutil', 'kupal', 'puki', 'pekpek', 'titi', 'tite', 'burat', 'etits', 
  'kantot', 'jakol', 'pakshet', 'punyeta', 'lecheng', 'leche', 'burikat', 'hinayupak'
];

/**
 * Normalizes input text to catch bypass attempts:
 * - Converts to lowercase
 * - Replaces common leetspeak substitutions (@ -> a, 3 -> e, 1 -> i/l, 0 -> o, $ -> s, etc.)
 * - Removes repeating consecutive characters (e.g., "gwaaaago" -> "gwago")
 * - Removes spaces, symbols, and punctuation
 */
function sanitizeAndCheckProfanity(text: string): boolean {
  if (!text) return false;

  let cleaned = text.toLowerCase()
    // Leetspeak / symbol replacements
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't')
    // Remove all non-alphanumeric characters and spaces
    .replace(/[^a-z]/g, '');

  // Collapse repeated characters to catch bypasses like "bOOObO" or "g-a-g-o"
  cleaned = cleaned.replace(/(.)\1+/g, '$1');

  // Check against direct matches or substrings
  for (const word of BANNED_WORDS) {
    // Normalized check of the banned word itself
    const normWord = word.toLowerCase().replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
    
    if (cleaned.includes(normWord)) {
      return true; // Contains restricted word
    }
  }

  return false;
}

export default function ChatSetupPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [selectedSchool, setSelectedSchool] = useState(SLU_SCHOOLS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load previously saved values from localStorage on mount
  useEffect(() => {
    const savedNickname = localStorage.getItem('unsaid_chat_nickname');
    const savedSchool = localStorage.getItem('unsaid_chat_school');

    if (savedNickname) {
      setNickname(savedNickname);
    }
    if (savedSchool && SLU_SCHOOLS.some(s => s.id === savedSchool)) {
      setSelectedSchool(savedSchool);
    }
  }, []);

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setErrorMsg('Please enter a valid nickname.');
      return;
    }

    // Run profanity & bypass filter check
    if (sanitizeAndCheckProfanity(trimmedNickname)) {
      setErrorMsg('Your nickname contains restricted, offensive, or prohibited words. Please choose another one.');
      return;
    }

    setIsSubmitting(true);

    try {
      localStorage.setItem('unsaid_chat_nickname', trimmedNickname);
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
            Chat
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
            Set up how other Louisian students will see you during your anonymous conversations.
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
              onChange={(e) => {
                setNickname(e.target.value);
                if (errorMsg) setErrorMsg(''); // Clear error on edit
              }}
              placeholder="e.g. someone"
              maxLength={25}
              required
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-base sm:text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-all"
            />
            {errorMsg && (
              <p className="text-xs font-mono text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                {errorMsg}
              </p>
            )}
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
            {isSubmitting ? 'Entering Queue...' : 'Find Chatmate Now'}
          </button>
        </form>
      </main>
    </div>
  );
}