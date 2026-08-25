"use client";

import { useRef, useState, useEffect } from "react";
import { Pencil } from "lucide-react";

const PREFIX = "prepagent_photo_";
const MAX_WIDTH = 900;
const QUALITY = 0.82;

function readStored(slotId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PREFIX + slotId);
  } catch {
    return null;
  }
}

// Downscales + re-encodes as JPEG before storing, so a handful of custom
// photos stay well under localStorage's ~5-10MB per-origin quota.
function resizeAndCompress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("That doesn't look like a valid image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Couldn't process that image."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface EditablePhotoProps {
  slotId: string;
  defaultSrc?: string;
  alt?: string;
  placeholder?: React.ReactNode;
  dim?: boolean;
}

export default function EditablePhoto({ slotId, defaultSrc, alt = "", placeholder, dim = true }: EditablePhotoProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // localStorage isn't available during SSR — this can only run after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(readStored(slotId) ?? defaultSrc ?? null);
  }, [slotId, defaultSrc]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await resizeAndCompress(file);
      localStorage.setItem(PREFIX + slotId, dataUrl);
      setSrc(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use that photo.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleTrigger(e: React.MouseEvent) {
    e.stopPropagation();
    inputRef.current?.click();
  }

  function handleReset(e: React.MouseEvent) {
    e.stopPropagation();
    localStorage.removeItem(PREFIX + slotId);
    setSrc(defaultSrc ?? null);
  }

  const isCustom = !!readStored(slotId);

  return (
    <div className="group absolute inset-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover ${dim ? "dark:brightness-[0.55] dark:contrast-125" : ""}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
          {placeholder}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      <button
        onClick={handleTrigger}
        title="Change photo"
        aria-label="Change photo"
        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur cursor-pointer"
      >
        <Pencil size={13} />
      </button>

      {isCustom && (
        <button
          onClick={handleReset}
          title="Reset to default photo"
          className="absolute bottom-2 right-11 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold px-2 py-1.5 rounded-full bg-black/60 text-white backdrop-blur cursor-pointer whitespace-nowrap"
        >
          Reset
        </button>
      )}

      {error && (
        <p className="absolute top-2 left-2 right-2 text-[11px] font-medium bg-red-600 text-white px-2 py-1 rounded-md">
          {error}
        </p>
      )}
    </div>
  );
}
