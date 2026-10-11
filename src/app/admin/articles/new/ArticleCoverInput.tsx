'use client';

import { useEffect, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';

const SOURCE_LIMIT = 10_000_000;
const UPLOAD_LIMIT = 600_000;
const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp'];

export function uploadArticleCover(file: File, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const form = new FormData();
    form.append('cover', file);
    request.open('POST', '/api/articles/cover');
    request.timeout = 45_000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let response: { url?: string; error?: string } = {};
      try { response = JSON.parse(request.responseText); } catch { /* Invalid response is handled below. */ }
      if (request.status >= 200 && request.status < 300 && response.url) resolve(response.url);
      else reject(new Error(response.error || 'Cover upload failed. Please try again.'));
    };
    request.onerror = () => reject(new Error('Network error while uploading the cover.'));
    request.ontimeout = () => reject(new Error('Cover upload timed out. Please try again.'));
    request.send(form);
  });
}

export default function ArticleCoverInput({ currentUrl, selected, onChange, onRemove, onBusyChange, uploadProgress, uploading }: {
  currentUrl: string | null;
  selected: File | null;
  onChange: (file: File) => void;
  onRemove: () => void;
  onBusyChange: (busy: boolean) => void;
  uploadProgress: number | null;
  uploading: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!selected) { setPreview(null); return; }
    const objectUrl = URL.createObjectURL(selected);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selected]);

  const prepare = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!SUPPORTED.includes(file.type) || file.size > SOURCE_LIMIT || file.size === 0) {
      setError('Choose a JPG, PNG, or WebP image smaller than 10 MB.');
      return;
    }
    setCompressing(true);
    onBusyChange(true);
    setCompressionProgress(0);
    try {
      const result = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1600,
        initialQuality: 0.8,
        useWebWorker: true,
        fileType: 'image/webp',
        onProgress: setCompressionProgress,
      });
      if (result.type !== 'image/webp' || result.size > UPLOAD_LIMIT || result.size === 0) {
        throw new Error('This photo could not be optimized safely. Try a smaller or different image.');
      }
      onChange(new File([result], 'article-cover.webp', { type: 'image/webp' }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not compress this image.');
    } finally {
      setCompressing(false);
      onBusyChange(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="text-xs text-neutral-400">
      <p className="mb-2 font-medium">Cover photo (optional)</p>
      <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); if (!compressing && !uploading) void prepare(event.dataTransfer.files[0]); }}
        className={`overflow-hidden rounded-xl border border-dashed ${dragging ? 'border-emerald-500 bg-emerald-950/20' : 'border-neutral-700 bg-neutral-950'}`}>
        {(preview || currentUrl) ? <img src={preview || currentUrl || ''} alt="Article cover preview" className="aspect-video w-full object-cover" /> : (
          <p className="px-4 py-7 text-center text-neutral-500">Drop a photo here or choose one from your device.</p>
        )}
        <div className="flex flex-wrap gap-2 border-t border-neutral-800 p-3">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
            aria-label="Choose article cover photo" onChange={(event) => void prepare(event.target.files?.[0])} />
          <button type="button" disabled={compressing || uploading} onClick={() => input.current?.click()}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-neutral-200 disabled:opacity-50">{(preview || currentUrl) ? 'Replace photo' : 'Choose photo'}</button>
          {(preview || currentUrl) && <button type="button" disabled={compressing || uploading} onClick={() => { onRemove(); setError(''); }} className="px-3 py-2 text-rose-400 disabled:opacity-50">Remove</button>}
        </div>
      </div>
      {compressing && <p role="status" className="mt-2">Compressing to WebP… {compressionProgress}%</p>}
      {selected && !compressing && !uploading && <p role="status" className="mt-2">Ready to upload · {Math.round(selected.size / 1024)} KB</p>}
      {uploading && <div role="status" className="mt-2">Uploading cover… {uploadProgress === null ? 'Preparing' : `${uploadProgress}%`}
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-800"><div className="h-full bg-emerald-500" style={{ width: `${uploadProgress || 0}%` }} /></div>
        {uploadProgress === 100 && <p className="mt-1">Finishing image processing…</p>}
      </div>}
      {error && <p role="alert" className="mt-2 text-rose-400">{error}</p>}
      <p className="mt-2 text-[11px] text-neutral-500">JPG, PNG, or WebP · up to 10 MB. Optimized to WebP before upload.</p>
    </div>
  );
}
