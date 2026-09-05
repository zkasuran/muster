// Copied from Opensource UI (MIT, Copyright (c) 2026 Bidyut Kundu), whose components
// expect this exact helper. Licence text at components/vendor/opensourceui/LICENSE.
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
