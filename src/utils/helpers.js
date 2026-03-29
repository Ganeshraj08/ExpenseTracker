import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount || 0);
}

export function downloadCSV(data, filename = 'varavuselavu_export.csv') {
  if (!data || !data.length) return;
  
  const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency'];
  const rows = data.map(tx => [
     new Date(tx.date).toLocaleDateString(),
     `"${tx.description.replace(/"/g, '""')}"`,
     tx.category,
     tx.type,
     tx.amount,
     'INR'
  ]);
  
  const csvContent = [
     headers.join(','),
     ...rows.map(e => e.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
