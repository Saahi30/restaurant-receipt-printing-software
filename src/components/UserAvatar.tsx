"use client";

import React, { useRef } from "react";
import { Camera, User as UserIcon } from "lucide-react";
import { fileToAvatarDataUrl } from "@/lib/avatar";

type Props = {
  name: string;
  avatar?: string | null;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onChange?: (dataUrl: string) => void;
  className?: string;
};

const sizeClass = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-base",
};

export function UserAvatar({ name, avatar, size = "md", editable, onChange, className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initials = (name || "?").trim().slice(0, 2).toUpperCase();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onChange) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const body = avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatar} alt={name} className="w-full h-full object-cover" />
  ) : (
    <span className="font-bold flex items-center justify-center w-full h-full gap-0.5">
      {initials.length ? initials : <UserIcon className="w-1/2 h-1/2 opacity-70" />}
    </span>
  );

  if (!editable) {
    return (
      <div
        className={`${sizeClass[size]} rounded-full overflow-hidden bg-slate-200 text-slate-600 flex-shrink-0 ${className}`}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`${sizeClass[size]} rounded-full overflow-hidden bg-slate-200 text-slate-600 flex-shrink-0 relative group ${className}`}
      title="Change photo"
    >
      {body}
      <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
        <Camera className="w-4 h-4 text-white" />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </button>
  );
}
