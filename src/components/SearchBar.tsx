"use client";

import React from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (v: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
};

export default function SearchBar({ value, onChange, onSubmit, onClear, placeholder = "Search...", className = "" }: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
      className={["flex items-center gap-2 w-full sm:max-w-md", className].filter(Boolean).join(" ")}
    >
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-700"
      />
      <button type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500">
        Search
      </button>
      {value?.trim() && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        >
          Clear
        </button>
      )}
    </form>
  );
}
