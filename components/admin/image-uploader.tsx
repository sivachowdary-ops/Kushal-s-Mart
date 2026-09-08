"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, GripVertical, ImageIcon, Loader2, AlertCircle } from "lucide-react";

export interface ImageUploaderProps {
  /** Current image URLs (stored in Product.images) */
  value: string[];
  /** Called whenever the list changes */
  onChange: (urls: string[]) => void;
  /** Max number of images allowed (default 20) */
  maxImages?: number;
  /** R2 folder prefix, default "products" */
  folder?: string;
}

// Convert any image file to WebP using the Canvas API (no library needed)
async function convertToWebP(file: File, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      // Cap at 1200px wide for performance
      const maxW = 1200;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) return reject(new Error("WebP conversion failed"));
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Could not load image")); };
    img.src = objectUrl;
  });
}

import { supabase } from "@/lib/supabase-client";

// Upload a single WebP File via our API
async function uploadToR2(file: File, folder: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  const headers: Record<string, string> = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {}

  const res = await fetch("/api/admin/upload", { method: "POST", headers, body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

// Delete an image by its key (extracted from URL)
async function deleteFromR2(url: string) {
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
  const key = publicUrl && url.startsWith(publicUrl) 
    ? url.replace(publicUrl + "/", "") 
    : url.includes("/products/")
    ? url.split("/products/").pop() ? `products/${url.split("/products/").pop()}` : ""
    : "";
  if (!key) return;

  const headers: Record<string, string> = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {}

  await fetch(`/api/admin/upload?key=${encodeURIComponent(key)}`, { method: "DELETE", headers });
}

interface ImageSlot {
  url: string;        // final R2 URL (empty while uploading)
  preview: string;    // local blob URL for instant preview
  uploading: boolean;
  error: string | null;
}

export function ImageUploader({ value, onChange, maxImages = 20, folder = "products" }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<ImageSlot[]>(
    value.map((url) => ({ url, preview: url, uploading: false, error: null }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragIndex = useRef<number | null>(null);

  // Synchronize slots when value is populated asynchronously from DB
  useEffect(() => {
    setSlots((prev) => {
      const currentCompletedUrls = prev.filter((s) => s.url && !s.uploading).map((s) => s.url);
      const isIdentical =
        value.length === currentCompletedUrls.length &&
        value.every((u, i) => u === currentCompletedUrls[i]);

      if (isIdentical) return prev;

      const inProgress = prev.filter((s) => s.uploading);
      const newCompleted: ImageSlot[] = value.map((url) => {
        const existing = prev.find((s) => s.url === url);
        return existing || { url, preview: url, uploading: false, error: null };
      });
      return [...newCompleted, ...inProgress];
    });
  }, [value]);

  // Use a ref to queue onChange calls outside of state updaters
  const pendingSyncRef = useRef<ImageSlot[] | null>(null);

  const syncUrls = useCallback((updated: ImageSlot[]) => {
    const nextUrls = updated.filter((s) => s.url && !s.uploading).map((s) => s.url);
    onChange(nextUrls);
  }, [onChange]);

  // Flush any pending sync after each render
  useEffect(() => {
    if (pendingSyncRef.current) {
      syncUrls(pendingSyncRef.current);
      pendingSyncRef.current = null;
    }
  });

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const remaining = maxImages - slots.filter((s) => !s.error).length;
    const toProcess = fileArray.slice(0, Math.max(0, remaining));

    if (!toProcess.length) return;

    // Create pending slots immediately (shows previews)
    const pending: ImageSlot[] = toProcess.map((f) => ({
      url: "",
      preview: URL.createObjectURL(f),
      uploading: true,
      error: null,
    }));

    setSlots((prev) => {
      const valid = prev.filter((s) => !s.error);
      return [...valid, ...pending];
    });

    // Convert + upload each file
    for (let i = 0; i < toProcess.length; i++) {
      const file = toProcess[i];
      const slotPreview = pending[i].preview;
      try {
        const webp = await convertToWebP(file);
        const url = await uploadToR2(webp, folder);
        setSlots((prev) => {
          const updated = prev.map((s) =>
            s.preview === slotPreview ? { ...s, url, uploading: false } : s
          );
          pendingSyncRef.current = updated;
          return updated;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setSlots((prev) =>
          prev.map((s) =>
            s.preview === slotPreview ? { ...s, uploading: false, error: msg } : s
          )
        );
      }
    }
  }, [slots, maxImages, folder, syncUrls]);

  const removeSlot = useCallback(async (idx: number) => {
    const slot = slots[idx];
    if (slot.url) {
      deleteFromR2(slot.url).catch(() => {}); // best-effort delete
    }
    URL.revokeObjectURL(slot.preview);
    setSlots((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      pendingSyncRef.current = updated;
      return updated;
    });
  }, [slots]);

  // Drag-to-reorder handlers
  const onDragStart = (idx: number) => { dragIndex.current = idx; };
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === idx) return;
    setSlots((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIndex.current!, 1);
      arr.splice(idx, 0, moved);
      dragIndex.current = idx;
      pendingSyncRef.current = arr;
      return arr;
    });
  };

  const activeSlots = slots.filter((s) => !s.error);
  const canAddMore = activeSlots.length < maxImages;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Product Images
          <span className="ml-1 font-normal text-gray-400">({activeSlots.length}/{maxImages}) — first image is the main photo</span>
        </label>
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
          >
            <Upload className="h-3 w-3" /> Add Image
          </button>
        )}
      </div>

      {/* Drop Zone — only show when no images yet or can add more */}
      {canAddMore && activeSlots.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 cursor-pointer transition-colors ${
            isDragging ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-white"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <ImageIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-700">Drag &amp; drop images here</p>
            <p className="text-xs text-gray-400 mt-0.5">or click to browse · JPG, PNG, WEBP · max 10MB each</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Auto-converted to WebP for fast loading</p>
          </div>
        </div>
      )}

      {/* Image Grid */}
      {activeSlots.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {activeSlots.map((slot, idx) => (
            <div
              key={slot.preview}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              className="relative group rounded-2xl border-2 border-gray-200 overflow-hidden bg-gray-50 aspect-square cursor-grab active:cursor-grabbing"
            >
              {/* Preview image */}
              <img
                src={slot.preview}
                alt={`Product image ${idx + 1}`}
                className="h-full w-full object-cover"
              />

              {/* Uploading overlay */}
              {slot.uploading && (
                <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 text-red-600 animate-spin" />
                  <span className="text-[10px] font-bold text-gray-600">Converting &amp; uploading...</span>
                </div>
              )}

              {/* First-image badge */}
              {idx === 0 && !slot.uploading && (
                <span className="absolute top-2 left-2 rounded-full bg-black px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-wider">
                  Main
                </span>
              )}

              {/* Drag handle */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-0.5 shadow">
                <GripVertical className="h-3.5 w-3.5 text-gray-500" />
              </div>

              {/* Remove button */}
              {!slot.uploading && (
                <button
                  type="button"
                  onClick={() => removeSlot(idx)}
                  className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {/* Add more slot */}
          {canAddMore && (
            <div
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 aspect-square cursor-pointer hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <Upload className="h-5 w-5 text-gray-300" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Add</span>
            </div>
          )}
        </div>
      )}

      {/* Error messages */}
      {slots.filter((s) => s.error).map((s, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-xs text-red-700 font-medium">{s.error}</span>
          <button
            type="button"
            onClick={() => setSlots((prev) => prev.filter((_, j) => prev.indexOf(s) !== j))}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <p className="text-[11px] text-gray-400">
        Drag images to reorder. The first image is shown as the main product photo.
      </p>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
