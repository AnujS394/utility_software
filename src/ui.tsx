import { createElement, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return createElement("button", { ...props, className: `btn ${className}` });
}
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return createElement("input", { ...props, className: `field ${className}` });
}
export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return createElement("select", { ...props, className: `field ${className}` }, children);
}
export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return createElement("textarea", { ...props, className: `field ${className}` });
}
export function Heading({ level = 2, className = "", children }: { level?: 1 | 2 | 3 | 4; className?: string; children: React.ReactNode }) {
  return createElement(`h${level}`, { className }, children);
}
