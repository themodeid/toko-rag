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

  // Jika berupa path lokal /uploads/...
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  
  // Gunakan same-origin relative path agar di-serve langsung oleh Next.js public / rewrites
  return cleanPath;
}
