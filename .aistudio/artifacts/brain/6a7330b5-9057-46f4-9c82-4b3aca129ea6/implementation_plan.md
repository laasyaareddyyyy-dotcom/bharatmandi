# Bharat Mandi: Wholesale Commission Agent (Adathiya) Management System

A mobile-friendly, offline-tolerant web application designed for wholesale mandi commission agents (Adathiyas) in India (specifically Gudimalkapur Market Yard). It enables fast lot entry (<30s per farmer), live mandi parchi slip generation with thermal print & WhatsApp sharing, APMC Form C invoice calculations with itemized deductions, and complete offline ledger tracking.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The implementation plan incorporates the exact answers provided during the initial clarification round:

- **Confirmed Choice 1 (Form C Preview & Lot Type Fixes)**: The Form C preview will dynamically load saved lot/shipment records (e.g., Marigold, 77 Kgs, ₹60,599) instead of hardcoded zero states, and lot types will strictly use unified descriptions across parchis and invoices.
- **Confirmed Choice 2 (High-Resolution Vector PDF)**: Form C invoices and Parchi slips will trigger direct, instant vector PDF downloads (`jspdf` + `html2canvas` / canvas vector rendering) alongside standard thermal printer dialogs.
- **Confirmed Choice 3 (Photo Upload Capabilities)**: The Instant Farmer Registration panel supports local file upload/gallery selection, live webcam capture, and instant sample photo avatar presets.

---

## 1. Overview & Core Concept

### What It Does
**BHARAT MANDI** digitizes daily wholesale mandi operations for commission merchants:
1. **Fast Lot Entry & Parchi Generation**: Record multi-lot arrivals (quantity, weight, rate per Kg, quality) and generate official Mandi Sale Parchis (`SHP-YYYYMMDD-NNN`) instantly.
2. **Instant Farmer Registration**: Register farmers in under 30 seconds with photo uploads (camera/file/preset), mobile validation, village auto-suggestions, and duplicate detection.
3. **APMC Form C Invoice & Deduction Engine**: Calculate net payable to farmers after Direct Cuts (Hamali & Transport) and APMC Deductions (Mandi Tax/Cess, Weighing/Kanta Charge, Crate Deposit, Market Fee).
4. **Offline-First Resilience**: All sales, parchis, farmers, and ledgers persist instantly to local storage and sync seamlessly with Cloud Firestore upon network reconnection.

### Target Audience & Context
Wholesale commission agents (Adathiyas) and mandi staff operating in busy market yards (e.g. Gudimalkapur, Hyderabad) on mobile phones, tablets, or desktop PCs during early morning auctions.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme
- **Color Palette**:
  - *Dominant Field (60%)*: Crisp white cards on very light grey-blue canvas (`#f1f5f9` / `#f8fafc`).
  - *Structural Surfaces (30%)*: Deep Navy (`#1a3a52` / `#1f2d45`) for headers, primary action buttons, net-amount banners, and lot cards.
  - *Accent & Soft Panels (10%)*: Gold/Amber (`#d97706` / `#f59e0b`) for icons and badges; Soft Cream/Yellow (`#fffbebf5` / `#fef3c7`) for farmer registration and misc deduction panels.
  - *Semantic Colors*: Emerald Green (`#16a34a`) for "Good" quality, "Online" status, and Net Payable; Crimson Red (`#dc2626`) for deductions and "Bad" quality.
- **Typography & Formatting**: Clean sans-serif (`Plus Jakarta Sans`) paired with tabular monospace numerals (`font-mono tabular-nums`) for currency (`₹60,599`) and parchi sequences.
- **Layout Rhythm**: Single centered column (`max-w-[1100px]`), rounded cards (`16px–20px` radius) with soft hairline borders and light shadows. Floating navy circular `+` button at bottom-right.

---

### Screen-by-Screen Wireframes & User Flows

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🌸 Mandi Wholesale Merchant – Gudimalkapur  [Dashboard][New Sale][Farmers] ● Online│
├─────────────────────────────────────────────────────────────────────────┤
│ FAST LOT ENTRY & MANDI PARCHI GENERATOR         [Date: 27/10/2026] [Today]│
│                                                                         │
│ ┌─ 1. SELECT REGISTERED FARMER ──────────────────────── [+ Add Farmer] ┐│
│ │ [Photo Upload Area: File | Camera | Presets]                         ││
│ │ [Name * (no digits)]  [Mobile (10 digits) *]  [Village / Area *]      ││
│ │ Search: [Search farmer by name, village, or mobile...        ]       ││
│ │ Card: Venkat Reddy (FRM-0001) · Shamshabad · +91 9848012345 · ₹0 Dues ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ 2 & 3. ITEM VARIETIES & RATES ───────────────────────────────────────┐│
│ │ ① Marigold (Genda)                           Subtotal: ₹60,599        ││
│ │ Commodity: [🌸 Flowers]                                              ││
│ │ Variety: [Marigold (Genda)          ▼]                                ││
│ │ [Boxes: 2] [Weight: 77 Kgs] [Rate: ₹787/Kgs] [Good | Avg | Bad]       ││
│ │ Subtotal: 2 Boxes · 77 Kgs × ₹787/Kgs (Good Quality) = ₹60,599       ││
│ └───────────────────────────────────────────────────────────────────────┘│
│ [+ Add Another Variety to Shipment]                Total (1 var, 77 Kgs): ₹60,599│
│                                                                         │
│ ┌─ 4. DEDUCTIONS PER TRANSACTION ─────────────────── [− ₹143 Deductions] ┐│
│ │ ┌─ Hamali / Labor (₹) ──────────────┐ ┌─ Transport (₹) ──────────────┐ ││
│ │ │ Amount: ₹77                       │ │ Freight Amount: ₹66          │ ││
│ │ └───────────────────────────────────┘ └──────────────────────────────┘ ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ NET AMOUNT TO FARMER ─────────────────────────────── Gross − Cuts ──┐│
│ │ Gross Turnover (₹60,599) – Direct Cuts (₹143)          ₹60,456       ││
│ └───────────────────────────────────────────────────────────────────────┘│
│ [ Form C PDF ]                       [ Save & Generate Mandi Parchi ]   │
│                                                                         │
│ ┌─ Daily Sales & Parchi Records (Tue, 27 Oct 2026) ───────────── (1) ──┐│
│ │ SHP-20261027-001 · Venkat Reddy · Marigold (Genda) · ₹60,456 [View/Edit]││
│ └───────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

#### Screen 1: Top Bar & Trading Date Header
- **Sticky Header**: Flower logo, merchant shop name, top nav links (*Dashboard*, *New Sale* [active], *Farmers*, *Help Desk*), and green/red online status indicator pill.
- **Date Switcher**: Active trading date badge with 1-click toggle to today. Changing dates dynamically switches the live sale list without reloading.

#### Screen 2: New Sale Entry View
- **Section 1: Select Registered Farmer**:
  - Collapsible cream panel for *Instant Farmer Registration*.
  - Circular avatar preview with 3 upload triggers: *Upload File*, *Take Photo (Camera)*, *Sample Presets*.
  - Name validation (blocks digits with "Name should contain letters only"), 10-digit mobile validation, duplicate mobile alert box (*"This farmer is already registered as [Name]. Select them instead?"*).
  - Search input with dropdown filtering name, village, mobile, and ID (`FRM-XXXX`). Selected state renders a compact card with dues and a *Change* button. Defaults to *General Mandi Farmer*.
- **Sections 2 & 3: Item Varieties & Rates**:
  - Multi-variety lot cards with navy headers, lot index, and live line subtotals.
  - Combobox for varieties with custom name fallback.
  - Number inputs for packaging count/type, weight/unit, rate/unit, and quality buttons (*Good*, *Avg*, *Bad*).
  - Live sentence subtotal calculation: `Subtotal: X Boxes · Y Kgs × ₹Z/Kgs (Good Quality) = ₹[X*Y]`.
- **Section 4: Deductions (Hamali & Transport)**:
  - Live total deductions badge (`− ₹143`).
  - Inputs for Hamali (labor) and Transport (fre Freight).
- **Net Amount Banner**: Navy card displaying `Gross Amount − Direct Cuts` = **₹60,456**.
- **Daily Records List**: Table of recorded parchis for the selected date with view, edit, and print triggers.

#### Screen 3: Modal A – Mandi Sale Parchi (`SHP-YYYYMMDD-NNN`)
- Compact thermal-printer printable voucher slip.
- Header controls: *WhatsApp Share*, *Copy Details*, *Download Vector PDF*, *Print Parchi* (thermal format), *Edit Details*, *Remove Parchi After Printing* toggle.
- Scrollable slip content: Adathiya merchant details, Parchi No., Date & Time, Farmer name & village, Variety breakdown table with quality pills, Mandi charges, and signature lines.

#### Screen 4: Modal B & Form C PDF Preview
- APMC Form C Invoice Generator.
- **Commission & Deduction Settings**:
  - *Mandi Commission*: Presets (0%, 2%, 4%, 5%, 6%), custom %, live calculation.
  - *Misc Charges*: Presets (0%, 0.5%, 1%, 2%), `% / ₹` toggle, numeric input.
  - *Recorded Freight & Labor*: Read-only direct cuts.
  - *Itemized APMC Deductions*: Toggles for Mandi Cess, Kanta/Weighing Charge, Crate Deposit, Market Fee.
- **Live A4 Form C Preview**: Real-time rendering of the official APMC invoice with itemized breakdown, turnover, total deductions, net payable to farmer, and settlement status.
- **Action Buttons**: Direct Vector PDF Download, WhatsApp Share, Copy.

#### Screen 5: Additional Views (Dashboard, Farmers Ledger, Help Desk)
- **Dashboard**: High-level KPIs (Today's Gross Turnover, Total Volume in Kgs, Active Parchis Count, Net Dues), recent transaction timeline, and quick-action buttons.
- **Farmers Tab**: Searchable farmer registry with avatar photos, village filter, and **Hisab & Settlements** ledger statement generator by date range.
- **Help Desk**: FAQ drawer, support contacts, and APMC commission rate calculator guide.

---

## 3. Key Product Decisions & Trade-Offs

| Decision Area | Chosen Approach | Rationale & Benefit |
| :--- | :--- | :--- |
| **Data Persistence** | Isolated LocalStorage + Async Cloud Firestore Sync | Guarantees 100% offline uptime during busy morning auctions without losing draft lots or saved parchis. |
| **PDF Generation Engine** | Dual Client Vector Engine (`jspdf` + canvas vector rendering) | Generates crisp, downloadable A4 Form C PDFs and thermal Parchi slips directly in the browser without server API latency. |
| **Photo Upload Engine** | Client-side Canvas Image Compression (max 200px, WEBP/JPEG) | Optimizes avatar photos to <30KB before saving to local storage or cloud, preventing quota bloat and ensuring quick rendering. |
| **Form Validation Strategy** | Real-time Inline Regex Enforcers + Guard Cards | Prevents invalid names (digits) and duplicate farmer mobile numbers while typing, reducing data entry errors under 30s. |

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BHARAT MANDI FRONTEND                            │
│                                                                             │
│  ┌────────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐ │
│  │   NewSaleView.tsx      │  │  ParchiModal.tsx    │  │ FormCPdfModal.tsx│ │
│  │ (Multi-lot & Farmer)   │  │ (Thermal Voucher)   │  │ (APMC Invoice)   │ │
│  └───────────┬────────────┘  └──────────┬──────────┘  └────────┬─────────┘ │
│              │                          │                      │            │
│              ▼                          ▼                      ▼            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                            MandiContext.tsx                           │  │
│  │       (Centralized React State Store, Local Drafts & Calculations)    │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│          ┌──────────────────────────┴──────────────────────────┐            │
│          ▼                                                     ▼            │
│  ┌───────────────────────────────┐           ┌───────────────────────────┐  │
│  │     deduplication.ts          │           │   vectorPdf.ts Engine     │  │
│  │ (Farmer & Lot Normalization)  │           │   (A4 Form C & Thermal)   │  │
│  └───────────────┬───────────────┘           └───────────────────────────┘  │
└──────────────────┼──────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PERSISTENCE & CLOUD SYNC LAYER                        │
│  ┌─────────────────────────────────┐      ┌──────────────────────────────┐  │
│  │ LocalStorage (User-Isolated)    │ ──── │ Cloud Firestore Sync         │  │
│  │ (Farmers, Lots, Shipments, etc) │      │ (subscribeToFirestore/Sync)  │  │
│  └─────────────────────────────────┘      └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Data Models

#### 1. Farmer (`Farmer`)
```typescript
interface Farmer {
  id: string; // FRM-0001
  name: string;
  phone: string; // 10 digits
  village: string;
  address?: string;
  photoUrl?: string; // Base64 data URL or photo asset
  farmerType?: 'Grower / Kisan' | 'Trader' | 'Other';
  primaryCrops?: CommodityCategory[];
  notes?: string;
  createdAt: string; // YYYY-MM-DD
  isArchived?: boolean;
}
```

#### 2. Consignment Shipment / Parchi (`Shipment`)
```typescript
interface Shipment {
  id: string; // shp-1700000000
  shipmentNumber: string; // SHP-20261027-001
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  farmerVillage: string;
  merchantId: string;
  merchantName: string;
  items: ShipmentItem[]; // Multi-variety lots
  grossTotal: number;
  transportCharge: number; // Freight
  hamaliCharge: number; // Labor
  netAmountAfterDailyCuts: number; // gross - (transport + hamali)
  paymentStatus: 'Unpaid' | 'Paid' | 'Partial';
  amountPaid: number;
  balanceDue: number;
}

interface ShipmentItem {
  id: string;
  commodityCategory: CommodityCategory;
  flowerVariety: string;
  boxesCount: number;
  packagingType: string; // Boxes, Bags, Crates
  quantity: number; // Weight in Kgs
  unit: WeightUnit;
  rate: number; // Rate per Kg
  flowerQuality: 'Good' | 'Avg' | 'Bad';
  lineTotal: number; // quantity * rate
}
```

#### 3. Form C Invoice Calculations Formula
```typescript
// Live Math Calculations
grossTurnover = SUM(item.quantity * item.rate);
directCuts = hamaliCharge + transportCharge;
commissionAmount = ROUND(grossTurnover * (commissionPercent / 100));
miscAmount = isFixedMisc ? fixedMiscAmount : ROUND(grossTurnover * (miscPercent / 100));
itemizedAPMCDeductions = mandiCess + kantaCharge + crateDeposit + marketFee;

totalDeductions = directCuts + commissionAmount + miscAmount + itemizedAPMCDeductions;
netPayableToFarmer = MAX(0, grossTurnover - totalDeductions);
```

---

## 5. Verification Plan & Test Matrix

1. **Compilation & Type Check**:
   - Run `compile_applet` and `lint_applet` (`tsc --noEmit`) after all code changes to confirm 0 build or lint errors.
2. **Farmer Registration Verification**:
   - Verify typing digits in name triggers `"Name should contain letters only."`.
   - Verify typing existing mobile number displays the duplicate callout card with 1-click select.
   - Verify file upload, live webcam preview, and sample photo presets successfully compress and attach photos.
3. **Multi-Lot Calculation Verification**:
   - Test adding 2+ varieties to a shipment and verify line subtotals (`weight * rate`) and packaging counts update live.
   - Verify Hamali and Transport subtractions correctly reflect in `Net Amount to Farmer`.
4. **Parchi & Form C PDF Generation**:
   - Test clicking *Save & Generate Mandi Parchi* creates a valid `SHP-YYYYMMDD-001` parchi and displays in daily records.
   - Test clicking *Form C PDF* opens Modal B with accurate itemized deductions and vector PDF download.
