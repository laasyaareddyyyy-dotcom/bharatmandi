import { CommodityCategory, WeightUnit } from '../types';

export interface FarmerVoiceParseResult {
  name: string;
  village: string;
  phone: string;
  primaryCrops: string[];
  rawTranscript: string;
}

export interface SaleVoiceParseResult {
  farmerName: string;
  farmerPhone: string;
  farmerVillage: string;
  commodityCategory: CommodityCategory;
  varietyName: string;
  quantity: number;
  unit: WeightUnit;
  ratePerUnit: number;
  commissionPercent: number;
  laborCharge: number;
  rentCharge: number;
  summaryText: string;
  rawTranscript: string;
  grossTotal: number;
  netFarmerPayable: number;
}

/**
 * Fallback parser for Farmer Voice input when AI server is unreachable or offline
 */
function fallbackParseFarmerVoice(transcript: string): FarmerVoiceParseResult {
  const clean = transcript.trim();
  
  // Find 10 digit phone number
  const phoneMatch = clean.match(/\b[6-9]\d{9}\b/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  // Remove phone from text to find name & village
  let textWithoutPhone = clean.replace(/\b[6-9]\d{9}\b/g, '').replace(/mobile|phone|number|నంబర్|నంబరు/gi, '');

  // Look for keywords like "village", "from", "గ్రామం", "गांव"
  let village = '';
  let name = '';

  const villageKeywords = ['village', 'from', 'గ్రామం', 'గామం', 'गांव', 'गाव'];
  let foundVillageKeyword = false;

  for (const kw of villageKeywords) {
    const idx = textWithoutPhone.toLowerCase().indexOf(kw);
    if (idx !== -1) {
      foundVillageKeyword = true;
      const after = textWithoutPhone.slice(idx + kw.length).trim().split(/\s+/);
      village = after.slice(0, 2).join(' ').replace(/[,.]/g, '');
      const before = textWithoutPhone.slice(0, idx).trim().split(/\s+/);
      name = before.slice(-3).join(' ').replace(/[,.]/g, '');
      break;
    }
  }

  if (!foundVillageKeyword) {
    // Split remaining words
    const words = textWithoutPhone.split(/\s+/).filter(w => w.length > 1);
    if (words.length >= 2) {
      name = words.slice(0, 2).join(' ');
      village = words.slice(2).join(' ') || 'Mandi Belt';
    } else if (words.length === 1) {
      name = words[0];
      village = 'Mandi Belt';
    }
  }

  return {
    name: name || 'Kisan Member',
    village: village || 'Mandi Yard',
    phone: phone || '',
    primaryCrops: ['flowers'],
    rawTranscript: transcript,
  };
}

/**
 * Fallback parser for Sale Voice input when AI server is unreachable or offline
 */
function fallbackParseSaleVoice(transcript: string): SaleVoiceParseResult {
  const text = transcript.trim();

  // Extract phone
  const phoneMatch = text.match(/\b[6-9]\d{9}\b/);
  const farmerPhone = phoneMatch ? phoneMatch[0] : '';

  // Extract numbers
  const numbers = (text.match(/\b\d+(?:\.\d+)?\b/g) || []).map(Number).filter(n => n !== Number(farmerPhone));

  // Extract commission rate
  let commissionPercent = 5;
  const commMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|ప్రిసెంట్|కమీషన్|कमीशन)/i) ||
                    text.match(/(?:commission|comm|కమీషన్|कमीशन)\s*(\d+(?:\.\d+)?)/i);
  if (commMatch && commMatch[1]) {
    commissionPercent = parseFloat(commMatch[1]);
  }

  // Extract labor / hamali charge
  let laborCharge = 0;
  const laborMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:rupees|rs|₹)?\s*(?:labor|labour|hamali|నమాలి|హమాలి|हमाली|मजदूरी)/i) ||
                     text.match(/(?:labor|labour|hamali|నమాలి|హమాలి|हमाली|मजदूरी)\s*(\d+(?:\.\d+)?)/i);
  if (laborMatch && laborMatch[1]) {
    laborCharge = parseFloat(laborMatch[1]);
  }

  // Filter out commission & labor from primary numbers if captured
  const primaryNumbers = numbers.filter(n => n !== commissionPercent && n !== laborCharge);

  let quantity = 10;
  let ratePerUnit = 50;

  if (primaryNumbers.length >= 2) {
    quantity = primaryNumbers[0];
    ratePerUnit = primaryNumbers[1];
  } else if (primaryNumbers.length === 1) {
    quantity = primaryNumbers[0];
  } else if (numbers.length >= 2) {
    quantity = numbers[0];
    ratePerUnit = numbers[1];
  }

  // Detect Unit
  let unit: WeightUnit = 'Kgs';
  if (/bag|bags|సంచి|మూట|బస్తా|बोरी|बस्ता/i.test(text)) unit = 'Bags';
  else if (/crate|crates|పెట్టె/i.test(text)) unit = 'Crates';
  else if (/quintal|quintals|క్వింటాల్|क्विंटल/i.test(text)) unit = 'Quintals';
  else if (/box|boxes|బాక్స్/i.test(text)) unit = 'Boxes';
  else if (/bunch|bunches|కట్ట/i.test(text)) unit = 'Bunches';

  // Detect Commodity & Variety
  let commodityCategory: CommodityCategory = 'flowers';
  let varietyName = 'Rose / Gulab';

  if (/grain|wheat|rice|paddy|maize|వరి|వరి ధాన్యం|గోధుమ/i.test(text)) {
    commodityCategory = 'grains';
    varietyName = 'Paddy / Wheat';
  } else if (/veggie|vegetable|tomato|potato|onion|టమోటా|ఉల్లి/i.test(text)) {
    commodityCategory = 'vegetables';
    varietyName = 'Tomato';
  } else if (/fruit|apple|mango|banana|మామిడి|ఆపిల్/i.test(text)) {
    commodityCategory = 'fruits';
    varietyName = 'Mango';
  } else if (/marigold|banthi|చామంతి|మల్లె|jasmine|జీనియా|కనకాంబరం|lily/i.test(text)) {
    commodityCategory = 'flowers';
    varietyName = 'Marigold / Banthi';
  } else if (/rose|gulab|గులాబీ/i.test(text)) {
    commodityCategory = 'flowers';
    varietyName = 'Rose / Gulab';
  }

  // Extract farmer name
  const words = text.replace(/farmer|grower|rate|commission|percent|rupees|labor|labour|hamali|bags|kgs|boxes|crates|rose|marigold|jasmine/gi, '').split(/\s+/).filter(w => !/\d/.test(w) && w.length > 1);
  const farmerName = words.length > 0 ? words.slice(0, 2).join(' ') : 'Kisan Member';

  const grossTotal = quantity * ratePerUnit;
  const commissionAmt = (grossTotal * commissionPercent) / 100;
  const netFarmerPayable = Math.max(0, grossTotal - commissionAmt - laborCharge);

  return {
    farmerName,
    farmerPhone,
    farmerVillage: 'Mandi Yard',
    commodityCategory,
    varietyName,
    quantity,
    unit,
    ratePerUnit,
    commissionPercent,
    laborCharge,
    rentCharge: 0,
    summaryText: `${quantity} ${unit} of ${varietyName} @ ₹${ratePerUnit}`,
    rawTranscript: transcript,
    grossTotal,
    netFarmerPayable,
  };
}

/**
 * Call Server Endpoint /api/ai/parse-voice powered by Gemini API
 */
export async function parseFarmerVoiceInput(
  transcript: string,
  audioBase64?: string
): Promise<FarmerVoiceParseResult> {
  try {
    const res = await fetch('/api/ai/parse-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'farmer',
        transcript,
        audioBase64,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.result) {
        return {
          name: data.result.name || 'Kisan Member',
          village: data.result.village || 'Mandi Yard',
          phone: data.result.phone ? String(data.result.phone).replace(/\D/g, '').slice(-10) : '',
          primaryCrops: Array.isArray(data.result.primaryCrops) ? data.result.primaryCrops : ['flowers'],
          rawTranscript: transcript,
        };
      }
    }
  } catch (err) {
    console.warn('Voice AI API call failed, falling back to local voice parser:', err);
  }

  return fallbackParseFarmerVoice(transcript);
}

/**
 * Call Server Endpoint /api/ai/parse-voice for Sale Entry
 */
export async function parseSaleVoiceInput(
  transcript: string,
  audioBase64?: string
): Promise<SaleVoiceParseResult> {
  try {
    const res = await fetch('/api/ai/parse-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'sale',
        transcript,
        audioBase64,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.result) {
        const r = data.result;
        const qty = Number(r.quantity) || 1;
        const rate = Number(r.ratePerUnit) || 0;
        const gross = qty * rate;
        const commPct = Number(r.commissionPercent) ?? 5;
        const commAmt = (gross * commPct) / 100;
        const labor = Number(r.laborCharge) || 0;
        const rent = Number(r.rentCharge) || 0;
        const net = Math.max(0, gross - commAmt - labor - rent);

        return {
          farmerName: r.farmerName || '',
          farmerPhone: r.farmerPhone ? String(r.farmerPhone).replace(/\D/g, '').slice(-10) : '',
          farmerVillage: r.farmerVillage || '',
          commodityCategory: (r.commodityCategory as CommodityCategory) || 'flowers',
          varietyName: r.varietyName || 'Rose',
          quantity: qty,
          unit: (r.unit as WeightUnit) || 'Kgs',
          ratePerUnit: rate,
          commissionPercent: commPct,
          laborCharge: labor,
          rentCharge: rent,
          summaryText: r.summaryText || `${qty} ${r.unit || 'Kgs'} of ${r.varietyName || 'Produce'} @ ₹${rate}`,
          rawTranscript: transcript,
          grossTotal: gross,
          netFarmerPayable: net,
        };
      }
    }
  } catch (err) {
    console.warn('Sale Voice AI API call failed, falling back to local parser:', err);
  }

  return fallbackParseSaleVoice(transcript);
}
