import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function Input({
  label,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      <span className="text-sm font-medium text-blue-900">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-2xl border border-[#b81414]/20 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#b81414] focus:ring-2 focus:ring-[#b81414]/30 ${className}`}
        {...props}
      />
    </label>
  );
}
