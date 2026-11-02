import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import {
  handleCheckUser,
  handleCheckUsername,
  handleSendOtp,
  handleVerifyOtp,
  handleRegisterPassword,
  handleResetPassword,
  handleLogin,
  handleLogout,
  handleMe,
  verifyAndAuthenticateToken,
  getHealthStatus,
} from './authHandler';
import {
  handleSyncData,
  handleFetchData,
  handleDeleteData,
} from './dataHandler';

const app = express();

// Comprehensive CORS & Preflight Middleware for Vercel Serverless & Local Dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// JSON Body parsing middleware
app.use(express.json({ limit: '10mb' }));

// Express Router for Vercel Serverless Function compatibility
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => res.json(getHealthStatus()));

// Auth routes
router.post('/auth/check-username', async (req, res) => res.json(await handleCheckUsername(req.body)));
router.post('/auth/check-user', async (req, res) => res.json(await handleCheckUser(req.body)));
router.post('/auth/send-otp', async (req, res) => res.json(await handleSendOtp(req.body, req)));
router.post('/auth/verify-otp', async (req, res) => res.json(await handleVerifyOtp(req.body)));
router.post('/auth/register-password', async (req, res) => res.json(await handleRegisterPassword(req.body)));
router.post('/auth/reset-password', async (req, res) => res.json(await handleResetPassword(req.body)));
router.post('/auth/login', async (req, res) => res.json(await handleLogin(req.body, req)));
router.post('/auth/logout', async (req, res) => res.json(await handleLogout(req)));
router.get('/auth/me', async (req, res) => {
  const result = await handleMe(req);
  if (!result.success) {
    return res.status(401).json(result);
  }
  res.json(result);
});

// Session Authentication Middleware for Protected API Endpoints
const requireSession = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization || req.headers['x-auth-token'] || '';
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  const authRes = await verifyAndAuthenticateToken(token);
  if (!authRes.valid) {
    return res.status(401).json({ success: false, error: authRes.error || 'Unauthorized session token. Please log in.' });
  }
  (req as any).user = authRes.user;
  next();
};

// Zero-Trust Merchant Data Routes (Session Protected)
router.post('/data/sync', requireSession, async (req, res) => {
  const userPhone = (req as any).user?.phoneNumber || (req as any).user?.phone;
  res.json(await handleSyncData(userPhone, req.body));
});

router.get('/data/fetch', requireSession, async (req, res) => {
  const userPhone = (req as any).user?.phoneNumber || (req as any).user?.phone;
  res.json(await handleFetchData(userPhone));
});

router.post('/data/delete', requireSession, async (req, res) => {
  const userPhone = (req as any).user?.phoneNumber || (req as any).user?.phone;
  const { itemType, itemId } = req.body || {};
  res.json(await handleDeleteData(userPhone, itemType, itemId));
});

// AI Voice Parsing Endpoint (Session Protected)
router.post('/ai/parse-voice', requireSession, async (req, res) => {
  try {
    const { mode = 'farmer', transcript = '' } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      return res.json({ success: false, error: 'GEMINI_API_KEY environment variable is not configured' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    if (mode === 'farmer') {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Extract farmer registration fields from this spoken voice message: "${transcript}". Details may be spoken in ANY order and ANY Indian language (English, Hindi, Telugu, Kannada, Tamil, Marathi, Hinglish, Tenglish, etc.).`,
        config: {
          systemInstruction: `You are an AI speech processing engine for Indian Agricultural Mandis (PhoolMitra / Bharat Mandi). Extract farmer registration details from spoken text. Clean phone numbers to 10 digits. Output strict JSON.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              village: { type: Type.STRING },
              phone: { type: Type.STRING },
              primaryCrops: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['name', 'village', 'phone', 'primaryCrops'],
          },
        },
      });

      let parsed = {};
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch {}

      return res.json({ success: true, mode, result: parsed });
    } else {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Extract consignment sale lot details from this spoken voice message: "${transcript}". Details (farmer name, mobile, village, commodity, variety, weight/quantity, rate, commission, labor) may be spoken in ANY order and ANY language.`,
        config: {
          systemInstruction: `You are an AI speech processing engine for Indian Agricultural Mandis (PhoolMitra / Bharat Mandi). Extract sale lot details from spoken text. Output strict JSON. Map unit to one of: 'Kgs', 'Bags', 'Crates', 'Quintals', 'Boxes', 'Bunches', 'Baskets'. Map commodityCategory to one of: 'flowers', 'grains', 'vegetables', 'fruits'.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              farmerName: { type: Type.STRING },
              farmerPhone: { type: Type.STRING },
              farmerVillage: { type: Type.STRING },
              commodityCategory: { type: Type.STRING },
              varietyName: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              ratePerUnit: { type: Type.NUMBER },
              commissionPercent: { type: Type.NUMBER },
              laborCharge: { type: Type.NUMBER },
              rentCharge: { type: Type.NUMBER },
              summaryText: { type: Type.STRING },
            },
            required: [
              'farmerName',
              'farmerPhone',
              'farmerVillage',
              'commodityCategory',
              'varietyName',
              'quantity',
              'unit',
              'ratePerUnit',
            ],
          },
        },
      });

      let parsed = {};
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch {}

      return res.json({ success: true, mode, result: parsed });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// AI Scribble / Handwriting Recognition Endpoint (Session Protected)
router.post('/ai/parse-scribble', requireSession, async (req, res) => {
  try {
    const { image = '', mode = 'variety', zones = [], textHint = '' } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      return res.json({ success: false, error: 'GEMINI_API_KEY environment variable is not configured' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    if (mode === 'zones' && Array.isArray(zones) && zones.length > 0) {
      const parts: any[] = [];

      zones.forEach((z: { zoneId: string; label: string; image: string }) => {
        if (!z.image) return;
        const base64Data = z.image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: base64Data,
          },
        });
        parts.push({
          text: `Handwritten image snippet from Positional Zone: "${z.zoneId}" (${z.label}).`,
        });
      });

      parts.push({
        text: `Analyze the provided handwritten snippets. Each snippet is from a STRICT POSITIONAL WRITING ZONE on a Flower Mandi entry pad.
Map each snippet ONLY to its assigned zone field based on position:
- 'variety': Flower variety name (e.g. Rose, Marigold, Jasmine, Chrysanthemum, Lily, Gerbera, Aster, Crossandra, Kakada, Chamanti, Gulabi, Mallepu, etc.)
- 'packaging': Packaging count (number) and packaging type (Boxes, Bags, Crates, Bunches, Baskets, Loose)
- 'quantity': Weight/quantity number and unit (Kgs, Quintals, Bags, Crates, Boxes, Bunches, Baskets)
- 'rate': Rate per unit in Rupees (number)
- 'quality': Flower quality grade (Good Quality (A), Super / Premium (A+), Average / Standard (B), Lower / Mixed (C))
- 'hamali': Labour/Hamali charge in Rupees (number)

CRITICAL: Position strictly identifies the field! A number in the 'rate' zone is ratePerUnit. A number in 'quantity' zone is quantity. Do NOT swap values between zones.
${textHint ? 'Context hint: ' + textHint : ''}`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          systemInstruction: `You are an AI OCR engine for positional writing zones on Indian Flower Mandi forms. Extract field values strictly matching their designated zone IDs.
Output strict JSON with schema:
varietyName: string,
packagingCount: number | null,
packagingType: string | null,
quantity: number | null,
unit: string | null,
ratePerUnit: number | null,
quality: string | null,
laborCharge: number | null,
unclearFields: string[] (list of zone IDs that were illegible or missing),
summaryText: string`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              varietyName: { type: Type.STRING },
              packagingCount: { type: Type.NUMBER },
              packagingType: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              ratePerUnit: { type: Type.NUMBER },
              quality: { type: Type.STRING },
              laborCharge: { type: Type.NUMBER },
              unclearFields: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              summaryText: { type: Type.STRING },
            },
          },
        },
      });

      let parsed = {};
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch {}

      return res.json({ success: true, mode, result: parsed });
    }

    const base64Data = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    if (mode === 'variety') {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data,
              },
            },
            {
              text: `Analyze this handwritten scribble from a Flower Mandi auction record. Extract the flower transaction details written on the canvas. ${textHint ? 'Context hint: ' + textHint : ''}`,
            },
          ],
        },
        config: {
          systemInstruction: `You are an AI OCR and handwriting extraction engine for Indian Flower Mandis (PhoolMitra / Bharat Mandi). Extract flower transaction fields from handwritten text. Handwriting may be in English, Hindi, Telugu, numbers, or abbreviations.
Popular Flower Varieties: Rose, Dutch Rose, Button Rose, Marigold, Jasmine, Lily, Chrysanthemum, Tuberose, Carnation, Gerbera, Orchids, Lotus, Aster, Crossandra, Gladiolus, Sampangi, Kanakambaram, Kakada, Chamanti, Gulabi, Mallepu.
Output strict JSON with fields: varietyName, packagingCount, packagingType (Boxes/Bags/Crates/Bunches/Baskets/Loose), quantity, unit (Kgs/Bags/Crates/Quintals/Boxes/Bunches/Baskets), ratePerUnit, quality (Good Quality (A)/Super / Premium (A+)/Average / Standard (B)/Lower / Mixed (C)), laborCharge (hamali in rupees).`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              varietyName: { type: Type.STRING },
              packagingCount: { type: Type.NUMBER },
              packagingType: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              ratePerUnit: { type: Type.NUMBER },
              quality: { type: Type.STRING },
              laborCharge: { type: Type.NUMBER },
              unclearFields: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              summaryText: { type: Type.STRING },
            },
            required: ['varietyName', 'quantity', 'unit', 'ratePerUnit'],
          },
        },
      });

      let parsed = {};
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch {}

      return res.json({ success: true, mode, result: parsed });
    } else if (mode === 'freight') {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data,
              },
            },
            {
              text: 'Extract transport freight charges and hamali labor charges written on this handwritten image.',
            },
          ],
        },
        config: {
          systemInstruction: 'Extract charges from handwritten text. Output JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transportCharge: { type: Type.NUMBER },
              laborCharge: { type: Type.NUMBER },
            },
          },
        },
      });

      let parsed = {};
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch {}

      return res.json({ success: true, mode, result: parsed });
    } else {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data,
              },
            },
            {
              text: 'Extract mandi commission percentage and miscellaneous charges written on this handwritten image.',
            },
          ],
        },
        config: {
          systemInstruction: 'Extract commission rate percentage and misc charge rupees from handwritten text. Output JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              commissionPercent: { type: Type.NUMBER },
              miscCharge: { type: Type.NUMBER },
            },
          },
        },
      });

      let parsed = {};
      try {
        parsed = JSON.parse(response.text || '{}');
      } catch {}

      return res.json({ success: true, mode, result: parsed });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Dual mounting: Both /api and root to support Vercel serverless rewrites seamlessly
app.use('/api', router);
app.use(router);

export { app, router };
export default app;
