'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import Link from 'next/link';

const plans = [
  {
    id: 'day',
    name: 'Quick Plug',
    price: 5,
    duration: '24 hours',
    description: 'For flash promos, same-day offers, and quick announcements.',
  },
  {
    id: 'three-days',
    name: 'Tambay Plug',
    price: 10,
    duration: '3 days',
    description: 'A little more time to stay visible around the Tambayan.',
  },
  {
    id: 'week',
    name: 'Weekly Plug',
    price: 20,
    duration: '7 days',
    description: 'Good for small businesses, services, commissions, and events.',
    recommended: true,
  },
  {
    id: 'two-weeks',
    name: 'Suki Plug',
    price: 35,
    duration: '14 days',
    description: 'For promos that need more time to reach the community.',
  },
] as const;

const categories = [
  'Small Business',
  'Food',
  'Service',
  'Commission',
  'Event',
  'Student Organization',
  'Other',
];

const benefits = [
  {
    title: 'Clearly sponsored',
    text: 'Paid plugs are labeled so they never get mixed up with anonymous Freedom Wall posts.',
  },
  {
    title: 'Manual review',
    text: 'Every ad is checked first to help keep scams, unsafe offers, and misleading content out.',
  },
  {
    title: 'Simple pricing',
    text: 'No ad manager, bidding system, or confusing dashboard. Pick a duration and send your plug.',
  },
];

export default function AdvertisePage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('week');

  const [advertiserName, setAdvertiserName] = useState('');
  const [contact, setContact] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Small Business');
  const [link, setLink] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
    const loadTheme = () => {
      try {
        const storedTheme = localStorage.getItem('unsaid_dark_mode');

        if (storedTheme !== null) {
          setIsDarkMode(JSON.parse(storedTheme));
        } else if (
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        ) {
          setIsDarkMode(true);
        }
      } catch {
        // Ignore theme errors.
      }
    };

    loadTheme();
    window.addEventListener('storage', loadTheme);

    return () => window.removeEventListener('storage', loadTheme);
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);

    try {
      localStorage.setItem('unsaid_dark_mode', JSON.stringify(nextMode));
    } catch {
      // Ignore storage errors.
    }
  };

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlan) || plans[2],
    [selectedPlan],
  );

  const canSubmit =
    advertiserName.trim().length >= 2 &&
    contact.trim().length >= 3 &&
    title.trim().length >= 2 &&
    description.trim().length >= 10 &&
    acceptedRules;

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormMessage('');

    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImageFile(null);
      setFormMessage('Please upload a JPG, PNG, or WEBP image.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageFile(null);
      setFormMessage('Please keep the promo image below 5 MB.');
      event.target.value = '';
      return;
    }

    setImageFile(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setFormMessage('Please complete the required fields and accept the advertising rules.');
      return;
    }

    // Front-end only for now. Connect this payload to Firestore/API later.
    const request = {
      plan: currentPlan.id,
      advertiserName: advertiserName.trim(),
      contact: contact.trim(),
      title: title.trim(),
      description: description.trim(),
      category,
      link: link.trim(),
      imageName: imageFile?.name || null,
    };

    console.log('Advertiser request ready:', request);
    setFormMessage(
      'Your request is ready. Connect this form to your Firestore/API submission before going live.',
    );
  };

  return (
    <div
      className={`min-h-screen transition-colors ${
        isDarkMode
          ? 'bg-neutral-950 text-neutral-100'
          : 'bg-[#fbfbf9] text-neutral-900'
      }`}
    >
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
          isDarkMode
            ? 'border-neutral-800 bg-neutral-950/90'
            : 'border-neutral-200/80 bg-[#fbfbf9]/90'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className="font-mono text-xl font-black tracking-tighter">
            TAMBAYAN<span className="text-emerald-600">.</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className={`font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition sm:text-[10px] ${
                isDarkMode
                  ? 'text-neutral-500 hover:text-white'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Back home
            </Link>

            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition ${
                isDarkMode
                  ? 'border-neutral-800 bg-neutral-900 text-amber-300 hover:bg-neutral-800'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {isDarkMode ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-12 sm:px-6 sm:pt-16">
        {/* HERO */}
        <section className={`grid items-end gap-10 border-b border-dashed pb-14 lg:grid-cols-[1.25fr_0.75fr] ${isDarkMode ? 'border-neutral-800' : 'border-neutral-300/70'}`}>
          <div>
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 sm:text-[10px]">
                Advertise on TambayanSLU
              </p>
            </div>

            <h1
              className={`max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl ${
                isDarkMode ? 'text-white' : 'text-neutral-950'
              }`}
            >
              May binebenta ka?
              <br />
              I-plug mo sa Tambayan.
            </h1>

            <p
              className={`mt-6 max-w-2xl text-sm leading-7 sm:text-base ${
                isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
              }`}
            >
              Promote a small business, service, commission, event, or student-led project
              through a clearly labeled sponsored spot on TambayanSLU.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-600 px-4 py-2 font-mono text-[9px] font-black uppercase tracking-wider text-white">
                Starts at ₱5
              </span>
              <span
                className={`font-mono text-[9px] ${
                  isDarkMode ? 'text-neutral-600' : 'text-neutral-400'
                }`}
              >
                small budget, no complicated setup
              </span>
            </div>
          </div>

          <div
            className={`rounded-3xl border p-5 sm:p-6 ${
              isDarkMode
                ? 'border-neutral-800 bg-neutral-900/70'
                : 'border-neutral-200 bg-white'
            }`}
          >
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600">
              Good to know
            </p>
            <div className="mt-5 space-y-4">
              <MiniInfo label="Payment" value="After approval" isDarkMode={isDarkMode} />
              <MiniInfo label="Review" value="Manual" isDarkMode={isDarkMode} />
              <MiniInfo label="Label" value="Sponsored" isDarkMode={isDarkMode} />
              <MiniInfo label="Starts" value="When published" isDarkMode={isDarkMode} />
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="py-14">
          <SectionEyebrow isDarkMode={isDarkMode}>Why plug here?</SectionEyebrow>
          <h2 className={`mt-2 text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : ''}`}>
            Simple ads for a student community.
          </h2>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {benefits.map((item, index) => (
              <div
                key={item.title}
                className={`rounded-2xl border p-5 ${
                  isDarkMode
                    ? 'border-neutral-800 bg-neutral-900/60'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <span className="font-mono text-[9px] font-black text-emerald-600">
                  0{index + 1}
                </span>
                <h3 className={`mt-4 text-sm font-black ${isDarkMode ? 'text-neutral-100' : 'text-neutral-900'}`}>
                  {item.title}
                </h3>
                <p className={`mt-2 text-xs leading-6 ${isDarkMode ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section className={`border-t py-14 ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200/80'}`}>
          <SectionEyebrow isDarkMode={isDarkMode}>Choose your plug</SectionEyebrow>
          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : ''}`}>
              Pick how long you want to stay visible.
            </h2>
            <p className="font-mono text-[9px] text-neutral-400">No recurring charge.</p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const selected = selectedPlan === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative min-h-[220px] rounded-2xl border p-5 text-left transition-all ${
                    selected
                      ? isDarkMode
                        ? 'border-emerald-600 bg-emerald-950/25 shadow-[0_0_0_1px_rgba(5,150,105,0.15)]'
                        : 'border-emerald-500 bg-emerald-50/60 shadow-sm'
                      : isDarkMode
                        ? 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                        : 'border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-sm'
                  }`}
                >
                  {plan.recommended && (
                    <span className="absolute right-4 top-4 rounded-full bg-emerald-600 px-2.5 py-1 font-mono text-[7px] font-black uppercase tracking-widest text-white">
                      Sulit
                    </span>
                  )}

                  <p
                    className={`font-mono text-[9px] font-black uppercase tracking-wider ${
                      selected
                        ? 'text-emerald-600'
                        : isDarkMode
                          ? 'text-neutral-400'
                          : 'text-neutral-500'
                    }`}
                  >
                    {plan.name}
                  </p>

                  <div className="mt-5 flex items-end gap-2">
                    <span className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-neutral-950'}`}>
                      ₱{plan.price}
                    </span>
                  </div>

                  <p className="mt-1 font-mono text-[9px] text-neutral-400">{plan.duration}</p>

                  <p className="mt-5 text-xs leading-6 text-neutral-500">{plan.description}</p>

                  <div className="mt-5 flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-wider">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        selected
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : isDarkMode
                            ? 'border-neutral-700'
                            : 'border-neutral-300'
                      }`}
                    >
                      {selected && <CheckIcon className="h-3 w-3" />}
                    </span>
                    {selected ? 'Selected' : 'Choose'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* FORM + PREVIEW */}
        <section className={`grid gap-8 border-t py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-start ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200/80'}`}>
          <form onSubmit={handleSubmit}>
            <SectionEyebrow isDarkMode={isDarkMode}>Submit a plug</SectionEyebrow>
            <h2 className={`mt-2 text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : ''}`}>
              Tell us what you&apos;re promoting.
            </h2>
            <p className="mt-2 max-w-lg text-xs leading-6 text-neutral-500">
              We&apos;ll review everything before payment and publishing.
            </p>

            <div className="mt-7 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldLabel label="Your name / business name" required>
                  <input
                    value={advertiserName}
                    onChange={(e) => setAdvertiserName(e.target.value)}
                    maxLength={60}
                    placeholder="e.g. Juan's Prints"
                    className={inputClass(isDarkMode)}
                  />
                </FieldLabel>

                <FieldLabel label="Contact" required>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    maxLength={100}
                    placeholder="Email, Messenger, or IG"
                    className={inputClass(isDarkMode)}
                  />
                </FieldLabel>
              </div>

              <FieldLabel label="What are you promoting?" required>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass(isDarkMode)}
                >
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </FieldLabel>

              <FieldLabel label="Ad title" required>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={60}
                  placeholder="Short and easy to recognize"
                  className={inputClass(isDarkMode)}
                />
                <CharacterCount current={title.length} max={60} />
              </FieldLabel>

              <FieldLabel label="Short description" required>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={220}
                  rows={5}
                  placeholder="What are you offering? Keep it casual, clear, and easy to read."
                  className={`${inputClass(isDarkMode)} resize-none`}
                />
                <CharacterCount current={description.length} max={220} />
              </FieldLabel>

              <FieldLabel label="Link (optional)">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className={inputClass(isDarkMode)}
                />
              </FieldLabel>

              <FieldLabel label="Promo image (optional)">
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-8 text-center transition ${
                    isDarkMode
                      ? 'border-neutral-700 bg-neutral-900/60 hover:border-emerald-700'
                      : 'border-neutral-300 bg-white hover:border-emerald-400'
                  }`}
                >
                  <UploadIcon className="h-5 w-5 text-emerald-600" />
                  <span className={`mt-2 text-xs font-bold ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    {imageFile ? imageFile.name : 'Upload your promo image'}
                  </span>
                  <span className="mt-1 font-mono text-[8px] text-neutral-400">
                    JPG, PNG or WEBP · max 5 MB
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </FieldLabel>

              <label
                className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${
                  isDarkMode
                    ? 'border-neutral-800 bg-neutral-900/60'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={acceptedRules}
                  onChange={(e) => setAcceptedRules(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-emerald-600"
                />
                <span className="text-xs leading-5 text-neutral-500">
                  I understand that submitted ads are manually reviewed and may be rejected if they
                  are unsafe, misleading, illegal, or not suitable for the TambayanSLU community.
                </span>
              </label>

              <div
                className={`rounded-2xl border p-5 ${
                  isDarkMode
                    ? 'border-emerald-900/60 bg-emerald-950/20'
                    : 'border-emerald-200 bg-emerald-50'
                }`}
              >
                <div className="flex items-center justify-between gap-5">
                  <div>
                    <p className="font-mono text-[8px] font-black uppercase tracking-widest text-emerald-600">
                      Selected plan
                    </p>
                    <p className={`mt-1 text-sm font-black ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
                      {currentPlan.name} · {currentPlan.duration}
                    </p>
                  </div>
                  <p className="text-3xl font-black text-emerald-600">₱{currentPlan.price}</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full rounded-xl px-5 py-4 font-mono text-[10px] font-black uppercase tracking-[0.16em] transition ${
                  canSubmit
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99]'
                    : isDarkMode
                      ? 'cursor-not-allowed bg-neutral-800 text-neutral-600'
                      : 'cursor-not-allowed bg-neutral-200 text-neutral-400'
                }`}
              >
                Review request · ₱{currentPlan.price}
              </button>

              <p className="text-center font-mono text-[8px] leading-5 text-neutral-400">
                You won&apos;t be asked to pay until your plug is approved.
              </p>

              {formMessage && (
                <p
                  className={`rounded-xl border px-4 py-3 text-xs leading-5 ${
                    isDarkMode
                      ? 'border-neutral-800 bg-neutral-900 text-neutral-400'
                      : 'border-neutral-200 bg-white text-neutral-600'
                  }`}
                >
                  {formMessage}
                </p>
              )}
            </div>
          </form>

          <aside className="lg:sticky lg:top-24">
            <SectionEyebrow isDarkMode={isDarkMode}>Live preview</SectionEyebrow>
            <h2 className={`mt-2 text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : ''}`}>
              This is how your plug could look.
            </h2>

            <article
              className={`mt-7 rounded-2xl border-2 p-5 shadow-xs transition-all sm:p-6 ${
                isDarkMode
                  ? 'border-neutral-700 bg-neutral-900'
                  : 'border-neutral-300 bg-white'
              }`}
            >
              {/* ENTRY-LIKE HEADER */}
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-emerald-600">
                      <AdIcon className="h-3 w-3" />
                      Sponsored
                    </span>

                    <span
                      className={`truncate font-mono text-[9px] ${
                        isDarkMode ? 'text-neutral-500' : 'text-neutral-500'
                      }`}
                    >
                      {advertiserName || 'Advertiser'}
                    </span>
                  </div>
                </div>

                <span
                  className={`shrink-0 max-w-[42%] truncate rounded-md border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider ${
                    isDarkMode
                      ? 'border-neutral-700 bg-neutral-800 text-neutral-300'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                  }`}
                >
                  {category}
                </span>
              </div>

              {/* TITLE + DESCRIPTION */}
              <div className="mb-5">
                <h3
                  className={`break-words text-xl font-black leading-snug sm:text-2xl ${
                    isDarkMode ? 'text-white' : 'text-neutral-950'
                  }`}
                >
                  {title || 'Your plug title'}
                </h3>

                <p
                  className={`mt-3 whitespace-pre-wrap break-words text-sm leading-6 ${
                    isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
                  }`}
                >
                  {description ||
                    'A short description of what you are promoting will appear here.'}
                </p>
              </div>

              {/* PHOTO ATTACHMENT */}
              <div
                className={`mb-5 overflow-hidden rounded-xl border ${
                  isDarkMode
                    ? 'border-neutral-800 bg-neutral-950'
                    : 'border-neutral-200 bg-neutral-100'
                }`}
              >
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="Promo preview"
                    className="max-h-[520px] w-full object-contain"
                  />
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-7 w-7 text-neutral-300" />
                      <p className="mt-2 font-mono text-[8px] font-black uppercase tracking-widest text-neutral-400">
                        Promo photo
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* LINK ROW */}
              <div
                className={`flex items-center justify-between gap-3 border-t pt-4 ${
                  isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-mono text-[8px] font-black uppercase tracking-wider text-neutral-400">
                    Link
                  </p>
                  <p
                    className={`mt-1 truncate text-xs ${
                      isDarkMode ? 'text-neutral-400' : 'text-neutral-600'
                    }`}
                  >
                    {link || 'Your Facebook, Instagram, or website'}
                  </p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-wider text-white">
                  Visit
                  <ArrowRightIcon className="h-3 w-3" />
                </span>
              </div>
            </article>

            <p className="mt-3 font-mono text-[8px] leading-5 text-neutral-400">
              Preview only. Final placement may be adjusted to fit TambayanSLU&apos;s layout.
            </p>
          </aside>
        </section>

        {/* HOW IT WORKS */}
        <section className={`border-t py-14 ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200/80'}`}>
          <SectionEyebrow isDarkMode={isDarkMode}>How it works</SectionEyebrow>
          <h2 className={`mt-2 text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : ''}`}>
            From submission to live plug.
          </h2>

          <div className="mt-7 grid gap-3 md:grid-cols-4">
            {[
              {
                number: '01',
                title: 'Send',
                text: 'Choose a plan and submit your ad details.',
              },
              {
                number: '02',
                title: 'Review',
                text: 'TambayanSLU checks the ad and its link manually.',
              },
              {
                number: '03',
                title: 'Pay',
                text: 'Approved ads receive payment instructions.',
              },
              {
                number: '04',
                title: 'Go live',
                text: 'Your paid duration starts when the sponsored post is published.',
              },
            ].map((item) => (
              <div
                key={item.number}
                className={`rounded-2xl border p-5 ${
                  isDarkMode
                    ? 'border-neutral-800 bg-neutral-900/60'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <span className="font-mono text-[9px] font-black text-emerald-600">{item.number}</span>
                <h3 className={`mt-4 text-xs font-black uppercase tracking-wide ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-neutral-500">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* RULES */}
        <section className={`border-t py-14 ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200/80'}`}>
          <div
            className={`rounded-3xl border p-6 sm:p-8 ${
              isDarkMode
                ? 'border-neutral-800 bg-neutral-900'
                : 'border-neutral-200 bg-white'
            }`}
          >
            <div className="grid gap-8 md:grid-cols-[0.75fr_1.25fr]">
              <div>
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600">
                  Advertising rules
                </p>
                <h2 className={`mt-3 text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : ''}`}>
                  Bago ka mag-plug.
                </h2>
              </div>

              <div className="space-y-5">
                <p className={`text-sm leading-7 ${isDarkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  No scams, misleading offers, NSFW content, gambling, illegal products or
                  services, malicious links, impersonation, or anything that could put users at
                  risk.
                </p>

                <div className={`border-t pt-5 ${isDarkMode ? 'border-neutral-800' : 'border-neutral-100'}`}>
                  <p className={`text-xs font-bold leading-6 ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    Payment does not automatically guarantee publication.
                  </p>
                  <p className="mt-1 text-xs leading-6 text-neutral-500">
                    TambayanSLU may reject, request edits to, pause, or remove an advertisement if
                    it violates the platform&apos;s advertising or safety rules.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOT NOTE */}
        <div className={`border-t pt-10 text-center ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200/80'}`}>
          <p className="font-mono text-[8px] leading-5 text-neutral-400">
            TambayanSLU is an independently operated student platform.
            <br />
            Not affiliated with or endorsed by Saint Louis University.
          </p>
        </div>
      </main>
    </div>
  );
}

function FieldLabel({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[8px] font-black uppercase tracking-widest text-neutral-400">
        {label}
        {required && <span className="ml-1 text-emerald-600">*</span>}
      </span>
      {children}
    </label>
  );
}

function CharacterCount({ current, max }: { current: number; max: number }) {
  return (
    <p className="mt-1.5 text-right font-mono text-[8px] text-neutral-400">
      {current}/{max}
    </p>
  );
}

function SectionEyebrow({ children, isDarkMode }: { children: ReactNode; isDarkMode: boolean }) {
  return (
    <p
      className={`font-mono text-[9px] font-black uppercase tracking-[0.18em] ${
        isDarkMode ? 'text-neutral-500' : 'text-neutral-400'
      }`}
    >
      {children}
    </p>
  );
}

function MiniInfo({
  label,
  value,
  isDarkMode,
}: {
  label: string;
  value: string;
  isDarkMode: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-mono text-[8px] font-black uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span className={`text-xs font-bold ${isDarkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
        {value}
      </span>
    </div>
  );
}

function inputClass(isDarkMode: boolean) {
  return `w-full rounded-xl border px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 ${
    isDarkMode
      ? 'border-neutral-700 bg-neutral-950 text-white'
      : 'border-neutral-200 bg-white text-neutral-900'
  }`;
}


type IconProps = {
  className?: string;
};

function SunIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.5 14.1Z" />
    </svg>
  );
}

function CheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function UploadIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function ImageIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 20" />
    </svg>
  );
}


function AdIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 11v2a2 2 0 0 0 2 2h2l4 4V5L7 9H5a2 2 0 0 0-2 2Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function ArrowRightIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
