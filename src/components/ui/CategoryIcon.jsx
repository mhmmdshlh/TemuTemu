/* eslint-disable react-refresh/only-export-components -- peta ikon + komponen satu modul */
import { Backpack, FileText, Key, Package, Pencil, Shirt, Smartphone, Wallet } from 'lucide-react'

export const categoryIcons = {
  dompet: Wallet,
  hp: Smartphone,
  tas: Backpack,
  kunci: Key,
  dokumen: FileText,
  pakaian: Shirt,
  'alat-tulis': Pencil,
  lainnya: Package,
}

/** Placeholder foto berupa ikon kategori. */
export default function CategoryIcon({ kategori = 'lainnya', size = 28, className = 'text-slate-500' }) {
  const Icon = categoryIcons[kategori] ?? Package
  return <Icon size={size} className={className} aria-hidden="true" />
}
