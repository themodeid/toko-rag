import React from "react";

/**
 * Helper untuk memastikan URL gambar selalu valid di Next.js (Localhost / Production)
 */
export function getProductImageUrl(imagePath?: string | null): string {
  if (!imagePath || typeof imagePath !== "string" || imagePath.trim() === "") {
    return "/uploads/matcha.jpg";
  }

  const trimmed = imagePath.trim();

  // Jika sudah berupa URL lengkap (http:// atau https://)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Gunakan relative path /uploads/... agar Caddy meneruskannya ke backend secara transparan
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return cleanPath;
}

/**
 * Fallback jika gambar 404/hilang di server agar UI tidak menampilkan broken image
 */
export function handleImageFallback(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl: string = "/uploads/matcha.jpg"
) {
  const target = e.currentTarget;
  if (!target.src.endsWith(fallbackUrl)) {
    target.src = fallbackUrl;
  }
}
