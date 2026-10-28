import { ServiceItem } from '../types.ts';

/**
 * Extracts a numeric value from text like "from ₹3,500 per video" -> 3500
 */
export function extractPriceFromText(priceText?: string): number {
  if (!priceText) return 0;
  const cleaned = priceText.replace(/,/g, '');
  const match = cleaned.match(/₹?\s*(\d+)/);
  if (match && match[1]) {
    return Number(match[1]) || 0;
  }
  return 0;
}

/**
 * Resolves standard base price for a given service selection.
 * Priority:
 * 1. Exact match in services list with base_price > 0
 * 2. Combo / Both handling: checks for combined package or sum of video + social
 * 3. Fallbacks: Video Editing = ₹3,500 | Social Media = ₹8,000 | Both = ₹11,500 (or ₹15,000)
 */
export function resolveServicePrice(serviceName: string, services: ServiceItem[] = []): number {
  if (!serviceName) return 3500;
  const nameLower = serviceName.toLowerCase().trim();

  // 1. Direct match in provided services
  const directMatch = services.find(s => s.name.toLowerCase().trim() === nameLower);
  if (directMatch) {
    if (directMatch.base_price && directMatch.base_price > 0) {
      return directMatch.base_price;
    }
    const extracted = extractPriceFromText(directMatch.price_text);
    if (extracted > 0) return extracted;
  }

  // 2. Both / Combo handling
  if (nameLower.includes('both') || nameLower.includes('combo') || nameLower.includes('retainer')) {
    const comboService = services.find(
      s => s.name.toLowerCase().includes('retainer') ||
           s.name.toLowerCase().includes('combo') ||
           s.name.toLowerCase().includes('both')
    );
    if (comboService?.base_price && comboService.base_price > 0) {
      return comboService.base_price;
    }
    const videoSrv = services.find(s => s.name.toLowerCase().includes('video'));
    const socialSrv = services.find(s => s.name.toLowerCase().includes('social'));
    const vPrice = videoSrv?.base_price || 3500;
    const sPrice = socialSrv?.base_price || 8000;
    return vPrice + sPrice; // ₹11,500 combo
  }

  // 3. Video Editing matching
  if (nameLower.includes('video') || nameLower.includes('edit')) {
    const videoSrv = services.find(s => s.name.toLowerCase().includes('video'));
    if (videoSrv?.base_price && videoSrv.base_price > 0) {
      return videoSrv.base_price;
    }
    return 3500;
  }

  // 4. Social Media matching
  if (nameLower.includes('social') || nameLower.includes('instagram') || nameLower.includes('media')) {
    const socialSrv = services.find(s => s.name.toLowerCase().includes('social'));
    if (socialSrv?.base_price && socialSrv.base_price > 0) {
      return socialSrv.base_price;
    }
    return 8000;
  }

  return 3500;
}
