/**
 * Oceanic Breeze photography used across the public site.
 *
 * The shop's photos were being served as full-size PNGs — about 1.3 MB each, so
 * roughly 10 MB of images on the landing page alone — which is what made the site
 * feel like it never stopped loading on a phone connection. The same photographs
 * are bundled here as WebP at the size they are actually displayed, about 300 KB
 * for all of them, and Vite gives each file a content hash so it can be cached
 * for as long as the design does not change.
 */
import bubbleTexturePhoto from "@/assets/photography/bubble-texture.webp";
import counterDropoffPhoto from "@/assets/photography/counter-dropoff.webp";
import equipmentPhoto from "@/assets/photography/equipment.webp";
import foldedLinensPhoto from "@/assets/photography/folded-linens.webp";
import heroPhoto from "@/assets/photography/hero.webp";
import serviceBedsheetPhoto from "@/assets/photography/service-bedsheet.webp";
import serviceComforterPhoto from "@/assets/photography/service-comforter.webp";
import serviceWashDryFoldPhoto from "@/assets/photography/service-wash-dry-fold.webp";

export const LABAFLOW_IMAGES = {
  hero: heroPhoto,
  foldedLinens: foldedLinensPhoto,
  counterDropoff: counterDropoffPhoto,
  bubbleTexture: bubbleTexturePhoto,
  equipment: equipmentPhoto,
};

/**
 * Service photos live on the shop's service records, so the optimised copies are
 * matched by the file name the shop saved. A photo the shop adds later is simply
 * used as stored.
 */
const SERVICE_PHOTOS: Record<string, string> = {
  "labaflow-service-wash-dry-fold_a8b4eb51.png": serviceWashDryFoldPhoto,
  "labaflow-service-bedsheet_354908f1.png": serviceBedsheetPhoto,
  "labaflow-service-comforter_934848ea.png": serviceComforterPhoto,
};

export function servicePhoto(url: string): string {
  const fileName = url.split("/").pop() ?? "";
  return SERVICE_PHOTOS[fileName] ?? url;
}
