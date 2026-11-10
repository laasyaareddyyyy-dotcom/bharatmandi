# A4 Mandi Sale Parchi (Form C) & Farmer Khata PDF Engine Architecture

High-precision, commercial-grade vector PDF rendering engine using `jsPDF` and `jspdf-autotable` to generate pixel-identical, non-overlapping A4 Mandi Sale Parchis (Form C) and Farmer Khata Statements with Live Modal Preview, Instant Download, and WhatsApp Sharing.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following implementation strategy incorporates all 3 confirmed choices from the Phase 1 questionnaire:

- **Confirmed Decision 1 (Rendering Engine)**: `jsPDF` + `jspdf-autotable` client-side vector PDF generation (WinAnsi compatible, zero raw `₹` character corruption, exact mm coordinates).
- **Confirmed Decision 2 (Document Scope)**: Applies standardized pixel-identical layout to **both** single Form C Parchi Receipts and multi-lot Farmer Khata Ledger Statements.
- **Confirmed Decision 3 (Action Flow)**: Integrated **Live PDF Preview Modal** (with zoom, print, download, and direct WhatsApp share buttons) alongside automatic download upon saving.

---

## 1. Overview & Core Concept

The goal is to upgrade and standardize the PDF generation logic in Bharat Mandi to produce statutory-grade Mandi Sale Parchis (Form C) and Farmer Statements that conform to strict commercial geometry:
- **Pixel-Identical A4 Dimensions**: 210mm × 297mm page layout with 6mm outer rounded canvas border, 12mm horizontal margins, and precise vertical grid alignment.
- **Strict Anti-Overlap Discipline**: Dynamic font scaling and padding for 8-column commodity tables, plus multi-page safety checks (`currentY + totalBottomNeeded > 280`) before rendering summary cards.
- **WinAnsi Currency Safety**: All currency values use standard Indian comma grouping (`formatRs`) without embedding raw `₹` characters in native jsPDF text strings.

---

## 2. Document Geometry & Visual Layout

### A. Document Canvas & Geometry Architecture
- **Page Standard**: A4 Portrait (`210mm × 297mm`).
- **Outer Frame**: Subtle slate border (`#E2E8F0`), 0.35mm line width, 3.5mm corner radius at `(x: 6mm, y: 6mm, w: 198mm, h: 285mm)`.
- **Inner Margins**: Left = 12mm, Right = 198mm (Width = 186mm), Top = 11mm.

### B. Visual Color Palette
- **Primary Dark Slate (`#0F172A`)**: Business titles, values, main headers.
- **Muted Slate (`#64748B`)**: Subtitles, field labels, table headers.
- **Forest Green (`#0B6B47`)**: Hero Net Farmer Payout banner, status badges (`PAID`).
- **Soft Green Fill (`#ECFDF5` / `#86EFAC`)**: Official receipt status pills.
- **Crimson Red (`#C40000`)**: Deductions, commission highlights, balance due.
- **Background Cards (`#F8FAFC` / `#E2E8F0`)**: 4-column metadata card, gross sales card, deductions summary grid.

### C. Layout Sections Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Logo]  GOPALA KRISHNA FLOWER MART            [OFFICIAL MANDI RECEIPT] │
│         Shop 14, Gudimalkapur Flower Market Yard                       │
│ ────────────────────────────────────────────────────────────────────── │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ PARCHI: FC-2026-0042 │ DATE: 09/11/2026 │ FARMER: V. REDDY │ VILLAGE │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 8-COLUMN COMMODITY TABLE (jsPDF-AutoTable)                         │ │
│ │ PARCHI & DATE | ITEM / CROP | BOXES | QTY | RATE | GROSS | COMM| NET │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ TOTAL SALES AMOUNT (GROSS):                             1,25,000.00│ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ MANDI CHARGES & COMMISSION DEDUCTIONS (2x2 Grid)                   │ │
│ │ Transport: 500.00 | Hamali: 300.00 | Comm (4%): 5,000.00 | Misc... │ │
│ │ TOTAL DEDUCTIONS:                                         -6,500.00│ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ HERO NET PAYABLE TO FARMER:                             1,18,500.00│ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────┬────────────────────────────────┐ │
│ │ SETTLEMENT STATUS: PAID (FULL)    │ AUTHORIZATION & SEAL           │ │
│ └───────────────────────────────────┴────────────────────────────────┘ │
│                OFFICIAL MANDI SALE PARCHI • FORM C                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Product Decisions & Technical Trade-offs

### 1. jsPDF + jspdf-autotable Native Vector Engine
- *Chosen Approach*: Direct vector drawing with `jsPDF` (`rect`, `roundedRect`, `text`, `line`, `setFillColor`, `setTextColor`) combined with `autoTable` for data rows.
- *Why*: Guarantees crisp text rendering at any zoom level, exact page positioning across browsers, sub-second PDF generation, and small file size (~30-60KB vs 2MB canvas screenshots).

### 2. WinAnsi Currency Formatter (`formatRs`)
- *Chosen Approach*: Formats numeric values to Indian number grouping with 2 decimal places (e.g., `1,25,000.00`), using "Rs." or numeric alignment instead of raw `₹` Unicode characters.
- *Why*: Standard jsPDF `helvetica` font uses WinAnsi encoding where raw `₹` renders as corrupted text (`¹` or character spacing errors).

### 3. Dynamic Line Height & Density Scaling
- *Chosen Approach*:
  - `< 8 rows`: 7.2pt font size, 1.4mm cell padding.
  - `8–14 rows`: 6.4pt font size, 0.9mm cell padding.
  - `15+ rows`: 5.6pt font size, 0.55mm cell padding.
- *Why*: Prevents multi-item consignments or long farmer statements from unnecessarily spilling over into empty 2nd pages while keeping small receipts spacious and readable.

### 4. Multi-Page Safety Guard
- *Chosen Approach*: Evaluates remaining vertical height before drawing financial summary cards:
  `if (currentY + totalBottomNeeded > 280) { doc.addPage(); drawPageChrome(doc, true); currentY = 24; }`
- *Why*: Eliminates truncated bottom cards or overlapping text when table data reaches the bottom of page 1.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Mandi Context & State                         │
│             (merchantProfile, selectedParchiLot, farmerKatha)           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    utils/vectorPdf.ts Engine Module                     │
│  - formatRs(amount: number): string                                     │
│  - generateVectorParchiPdf(formCData, options): jsPDF                   │
│  - generateVectorKathaPdf(kathaData, options): jsPDF                    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│     Live PDF Preview Modal            │ │   Direct Download & WhatsApp  │
│  (blobUrl, Zoom, Print, Share buttons)│ │   (Vector Blob / PDF Download)│
└───────────────────────────────────────┘ └───────────────────────────────┘
```

### Data Pipeline & Component Mapping
1. `src/utils/vectorPdf.ts`:
   - Updated helper `generateVectorParchiPdf` to implement the exact A4 geometry, 4-column metadata card, 8-column autoTable, 2x2 deductions grid, hero green net banner, split status/seal box, and fixed footer.
   - New helper `generateVectorKathaPdf` for multi-lot farmer statement ledgers with identical styling.
2. `src/utils/formCDataBuilder.ts`:
   - Prepares clean structured data objects (`FormCInvoiceData`) from `SaleLot`, `MerchantProfile`, and `Farmer` records.
3. `src/components/common/GeneratePdfModal.tsx`:
   - Enhanced live preview modal displaying the rendered vector PDF via object URL iframe, with action buttons: *Download PDF*, *Share on WhatsApp*, *Print*, and *Close*.

---

## 5. Implementation Roadmap & Milestones

1. **Step 1: Core Vector Generator Enhancement (`src/utils/vectorPdf.ts`)**
   - Refactor `generateVectorParchiPdf` to implement exact A4 geometry, outer chrome border (`#E2E8F0`), WinAnsi-safe `formatRs`, 4-column metadata card, 8-column autoTable styling, 2x2 deductions grid, hero green banner (`#0B6B47`), split status/signature box, and fixed footer.

2. **Step 2: Statement Vector Generator (`src/utils/vectorPdf.ts`)**
   - Implement `generateVectorKathaPdf` for multi-lot farmer statements with identical geometry, date range headers, itemized consignment rows, and financial balance summaries.

3. **Step 3: Preview Modal & Actions Integration (`GeneratePdfModal.tsx` & `NewSaleView.tsx`)**
   - Connect live PDF preview modal with PDF blob generation.
   - Add WhatsApp sharing with blob/download fallback and direct download triggers.

4. **Step 4: Quality Verification & Testing**
   - Verify zero lint/TypeScript errors (`lint_applet`).
   - Run compilation check (`compile_applet`).
   - Test PDF generation across single-item sales, multi-item consignments, and multi-page farmer statements.
