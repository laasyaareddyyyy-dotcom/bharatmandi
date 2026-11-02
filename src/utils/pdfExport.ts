import { toCanvas, toPng } from 'html-to-image';

// Helper to dynamically load heavy PDF libraries (jsPDF and html2canvas) on-demand
async function loadPdfLibraries() {
  const [jsPDFModule, html2canvasModule] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const jsPDFClass = (jsPDFModule.jsPDF || jsPDFModule.default) as any;
  const html2canvasFn = (html2canvasModule.default || html2canvasModule) as any;
  return { jsPDF: jsPDFClass, html2canvas: html2canvasFn };
}

export interface PdfExportOptions {
  filename: string;
  title?: string;
  format?: 'a4' | 'thermal-80mm' | 'thermal-58mm' | 'letter';
  orientation?: 'portrait' | 'landscape';
  marginMm?: number;
  scale?: number;
  fitToPage?: boolean;
  autoDownload?: boolean;
}

export interface PdfExportResult {
  success: boolean;
  filename: string;
  blob?: Blob;
  blobUrl?: string;
  error?: string;
}

export interface SharePdfOptions {
  blob?: Blob;
  file?: File;
  filename: string;
  title?: string;
  text?: string;
  fallbackToDownload?: boolean;
}

export interface SharePdfResult {
  shared: boolean;
  downloaded: boolean;
  method: 'web-share' | 'download-fallback' | 'cancelled' | 'error';
  error?: string;
}

/**
 * Downloads a Blob to the user's device with wide browser and iframe compatibility
 */
export function downloadBlob(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, 1500);
    console.log(`[PDF Export] Successfully initiated download for: ${filename}`);
  } catch (err) {
    console.error('[PDF Export] Failed to download blob via anchor click:', err);
    const fallbackUrl = URL.createObjectURL(blob);
    window.open(fallbackUrl, '_blank');
  }
}

/**
 * Determines target render width in pixels for standard document typography
 */
function getTargetRenderWidth(
  format: 'a4' | 'thermal-80mm' | 'thermal-58mm' | 'letter' = 'a4',
  orientation: 'portrait' | 'landscape' = 'portrait'
): number {
  if (format === 'thermal-80mm') return 384; // 72mm printable width at thermal dot density
  if (format === 'thermal-58mm') return 288; // 48mm printable width at thermal dot density
  if (format === 'letter') {
    return orientation === 'landscape' ? 1100 : 820;
  }
  // A4
  return orientation === 'landscape' ? 1140 : 820;
}

/**
 * Recursively prepares and un-clips cloned DOM tree for full document capture
 */
function prepareClonedElement(clone: HTMLElement, targetWidth: number): void {
  // Base container sizing - use setProperty with important to override all Tailwind/inline styles
  clone.style.setProperty('width', `${targetWidth}px`, 'important');
  clone.style.setProperty('min-width', `${targetWidth}px`, 'important');
  clone.style.setProperty('max-width', `${targetWidth}px`, 'important');
  clone.style.setProperty('box-sizing', 'border-box', 'important');
  clone.style.setProperty('overflow', 'visible', 'important');
  clone.style.setProperty('position', 'relative', 'important');
  clone.style.setProperty('margin', '0 auto', 'important');
  clone.style.setProperty('background-color', '#ffffff', 'important');
  clone.style.setProperty('color', '#000000', 'important');
  clone.style.setProperty('transform', 'none', 'important');
  (clone.style as any).webkitFontSmoothing = 'antialiased';

  // Process all children
  const allNodes = clone.querySelectorAll('*');
  allNodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;

    // Handle print visibility classes
    if (
      node.classList.contains('no-print') ||
      node.classList.contains('no-print-area') ||
      (node.tagName.toLowerCase() === 'button' && !node.classList.contains('print-include'))
    ) {
      node.style.setProperty('display', 'none', 'important');
      return;
    }

    if (node.classList.contains('force-pdf-show') || node.classList.contains('print-only')) {
      node.style.setProperty('display', 'block', 'important');
    }

    // Un-clip scrolling & overflow constraints on scroll containers so content isn't cut
    if (
      node.classList.contains('overflow-x-auto') ||
      node.classList.contains('overflow-y-auto') ||
      node.classList.contains('overflow-hidden') ||
      node.classList.contains('overflow-auto')
    ) {
      node.style.setProperty('overflow', 'visible', 'important');
      node.style.setProperty('max-height', 'none', 'important');
      node.style.setProperty('width', '100%', 'important');
    }

    // Ensure full table width and normal word boundaries
    if (node.tagName.toLowerCase() === 'table') {
      node.style.setProperty('width', '100%', 'important');
      node.style.setProperty('max-width', '100%', 'important');
      node.style.setProperty('table-layout', 'auto', 'important');
      node.style.setProperty('border-collapse', 'collapse', 'important');
      node.style.setProperty('overflow', 'visible', 'important');
    }

    if (node.tagName.toLowerCase() === 'td' || node.tagName.toLowerCase() === 'th') {
      node.style.setProperty('white-space', 'normal', 'important');
      node.style.setProperty('word-break', 'normal', 'important');
      node.style.setProperty('overflow-wrap', 'break-word', 'important');
      node.style.setProperty('hyphens', 'none', 'important');
    }

    // Replace oklch/modern colors if any in computed inline styles
    if (node.style.backgroundColor && node.style.backgroundColor.includes('oklch')) {
      node.style.setProperty('background-color', '#ffffff', 'important');
    }
    if (node.style.color && node.style.color.includes('oklch')) {
      node.style.setProperty('color', '#111827', 'important');
    }
    if (node.style.borderColor && node.style.borderColor.includes('oklch')) {
      node.style.setProperty('border-color', '#d1d5db', 'important');
    }
  });
}

/**
 * Copies interactive states (canvas bitmaps, input values) from source to clone
 */
function syncSourceStateToClone(source: HTMLElement, clone: HTMLElement): void {
  // Sync canvas contents (such as QR codes or barcodes)
  const sourceCanvases = source.querySelectorAll('canvas');
  const cloneCanvases = clone.querySelectorAll('canvas');
  sourceCanvases.forEach((srcCanvas, i) => {
    const destCanvas = cloneCanvases[i];
    if (destCanvas) {
      destCanvas.width = srcCanvas.width;
      destCanvas.height = srcCanvas.height;
      const destCtx = destCanvas.getContext('2d');
      if (destCtx) {
        destCtx.drawImage(srcCanvas, 0, 0);
      }
    }
  });

  // Sync text inputs and textareas
  const sourceInputs = source.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  const cloneInputs = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  sourceInputs.forEach((srcInput, i) => {
    const destInput = cloneInputs[i];
    if (destInput) {
      destInput.value = srcInput.value;
      if (srcInput instanceof HTMLInputElement && srcInput.type === 'checkbox') {
        (destInput as HTMLInputElement).checked = srcInput.checked;
      }
    }
  });
}

/**
 * Creates an isolated offscreen staging sandbox to render full unconstrained layout
 */
async function createStagedClone(
  element: HTMLElement,
  format: 'a4' | 'thermal-80mm' | 'thermal-58mm' | 'letter',
  orientation: 'portrait' | 'landscape'
): Promise<{ stagingWrapper: HTMLElement; clone: HTMLElement; targetWidth: number }> {
  const targetWidth = getTargetRenderWidth(format, orientation);

  const stagingWrapper = document.createElement('div');
  stagingWrapper.id = `pdf-staging-${Date.now()}`;
  stagingWrapper.style.position = 'fixed';
  stagingWrapper.style.left = '-99999px';
  stagingWrapper.style.top = '0';
  stagingWrapper.style.width = `${targetWidth}px`;
  stagingWrapper.style.zIndex = '-99999';
  stagingWrapper.style.opacity = '1';
  stagingWrapper.style.pointerEvents = 'none';
  stagingWrapper.style.backgroundColor = '#ffffff';
  stagingWrapper.style.boxSizing = 'border-box';

  const clone = element.cloneNode(true) as HTMLElement;
  prepareClonedElement(clone, targetWidth);
  syncSourceStateToClone(element, clone);

  stagingWrapper.appendChild(clone);
  document.body.appendChild(stagingWrapper);

  // Allow browser layout engine to calculate exact geometry
  await new Promise((resolve) => setTimeout(resolve, 60));

  return { stagingWrapper, clone, targetWidth };
}

/**
 * Renders staged DOM node to canvas using high-fidelity html-to-image with fallback
 */
async function renderStagedElementToCanvas(
  element: HTMLElement,
  targetWidth: number,
  scale: number
): Promise<{ canvas: HTMLCanvasElement; imgData: string }> {
  const measuredWidth = Math.max(targetWidth, element.scrollWidth, element.offsetWidth);
  const measuredHeight = Math.max(element.scrollHeight, element.offsetHeight);
  const pixelRatio = Math.min(3, Math.max(2, scale));

  // Strategy 1: html-to-image toCanvas (Crisp vector font & full canvas dimensions)
  try {
    const canvas = await toCanvas(element, {
      quality: 0.98,
      pixelRatio,
      width: measuredWidth,
      height: measuredHeight,
      canvasWidth: Math.round(measuredWidth * pixelRatio),
      canvasHeight: Math.round(measuredHeight * pixelRatio),
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
      filter: (node) => {
        if (node instanceof HTMLElement) {
          if (node.classList?.contains('no-print') || node.classList?.contains('no-print-area')) {
            return false;
          }
        }
        return true;
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    return { canvas, imgData };
  } catch (primaryErr) {
    console.warn('[PDF Export] Primary toCanvas failed, attempting toPng fallback...', primaryErr);

    // Strategy 2: html-to-image toPng
    try {
      const dataUrl = await toPng(element, {
        pixelRatio,
        width: measuredWidth,
        height: measuredHeight,
        canvasWidth: Math.round(measuredWidth * pixelRatio),
        canvasHeight: Math.round(measuredHeight * pixelRatio),
        backgroundColor: '#ffffff',
        skipFonts: true,
        fontEmbedCSS: '',
        filter: (node) => !(node instanceof HTMLElement && (node.classList?.contains('no-print') || node.classList?.contains('no-print-area'))),
      });

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = img.naturalWidth || img.width;
      fallbackCanvas.height = img.naturalHeight || img.height;
      const ctx = fallbackCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
        ctx.drawImage(img, 0, 0);
      }
      return { canvas: fallbackCanvas, imgData: dataUrl };
    } catch (secondaryErr) {
      console.warn('[PDF Export] Secondary toPng failed, falling back to html2canvas...', secondaryErr);

      // Strategy 3: html2canvas
      const { html2canvas } = await loadPdfLibraries();
      const h2cCanvas = await html2canvas(element, {
        scale: pixelRatio,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: measuredWidth,
        height: measuredHeight,
        windowWidth: measuredWidth,
        windowHeight: measuredHeight,
      });

      const imgData = h2cCanvas.toDataURL('image/jpeg', 0.98);
      return { canvas: h2cCanvas, imgData };
    }
  }
}

/**
 * Intelligent slice point locator that finds blank whitespace rows between table rows
 * so lines of text are never sliced in half horizontally across pages.
 */
function findCleanSlicePoint(
  ctx: CanvasRenderingContext2D,
  width: number,
  idealSliceY: number,
  minSliceY: number,
  maxSliceY: number
): number {
  try {
    const clampedIdeal = Math.min(Math.max(idealSliceY, minSliceY), maxSliceY);
    const searchRange = Math.min(60, clampedIdeal - minSliceY);
    
    // Sample horizontal lines from idealSliceY upward
    for (let offset = 0; offset < searchRange; offset++) {
      const candidateY = Math.round(clampedIdeal - offset);
      if (candidateY < minSliceY) break;

      const imgData = ctx.getImageData(0, candidateY, width, 1);
      const data = imgData.data;
      let isRowClean = true;

      // Check if almost all pixels in this row are white/very light background
      let darkPixels = 0;
      for (let i = 0; i < data.length; i += 16) { // step by 4 pixels (16 bytes) for speed
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // If pixel is darker than light gray (#e5e5e5)
        if (r < 230 || g < 230 || b < 230) {
          darkPixels++;
          if (darkPixels > 3) {
            isRowClean = false;
            break;
          }
        }
      }

      if (isRowClean) {
        return candidateY;
      }
    }
  } catch {
    // If pixel read is restricted, fallback to idealSliceY
  }

  return idealSliceY;
}

/**
 * Generates a pristine, full-resolution PDF document from any HTML element
 * with auto-fitting, continuous thermal rolls, and intelligent row pagination.
 */
export async function exportElementToPdf(
  element: HTMLElement | null,
  options: PdfExportOptions
): Promise<PdfExportResult> {
  const {
    filename = 'PhoolMitra-Document.pdf',
    format = 'a4',
    orientation = 'portrait',
    marginMm = 6,
    scale = 2,
    fitToPage,
    autoDownload = true,
  } = options;

  if (!element) {
    const err = 'Export target element was not found in DOM';
    console.error('[PDF Export Error]', err);
    return { success: false, filename, error: err };
  }

  console.log(
    `[PDF Export] Generating full PDF for "${filename}" (format: ${format}, orientation: ${orientation})...`
  );

  let stagingWrapper: HTMLElement | null = null;

  try {
    // 1. Create unconstrained, standardized staging clone
    const staged = await createStagedClone(element, format, orientation);
    stagingWrapper = staged.stagingWrapper;

    // 2. Render staged clone to high-resolution canvas
    const { canvas, imgData } = await renderStagedElementToCanvas(
      staged.clone,
      staged.targetWidth,
      scale
    );

    // 3. Configure jsPDF document based on format
    const { jsPDF } = await loadPdfLibraries();
    let pdf: any;

    if (format === 'thermal-80mm') {
      // 80mm thermal receipt roll (72mm printable width) - 1 Continuous Full Roll
      const contentWidthMm = 72;
      const contentHeightMm = (canvas.height * contentWidthMm) / canvas.width;
      const totalPageHeightMm = Math.max(60, contentHeightMm + marginMm * 2);

      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, totalPageHeightMm],
      });

      const xOffset = (80 - contentWidthMm) / 2;
      pdf.addImage(imgData, 'JPEG', xOffset, marginMm, contentWidthMm, contentHeightMm);
    } else if (format === 'thermal-58mm') {
      // 58mm thermal receipt roll (48mm printable width) - 1 Continuous Full Roll
      const contentWidthMm = 48;
      const contentHeightMm = (canvas.height * contentWidthMm) / canvas.width;
      const totalPageHeightMm = Math.max(50, contentHeightMm + marginMm * 2);

      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [58, totalPageHeightMm],
      });

      const xOffset = (58 - contentWidthMm) / 2;
      pdf.addImage(imgData, 'JPEG', xOffset, marginMm, contentWidthMm, contentHeightMm);
    } else {
      // Standard A4 or Letter document
      const isLetter = format === 'letter';
      const isLandscape = orientation === 'landscape';

      const pageWidth = isLetter ? (isLandscape ? 279.4 : 215.9) : (isLandscape ? 297 : 210);
      const pageHeight = isLetter ? (isLandscape ? 215.9 : 279.4) : (isLandscape ? 210 : 297);

      const printableWidth = pageWidth - marginMm * 2;
      const printableHeight = pageHeight - marginMm * 2;

      const naturalHeightMm = (canvas.height * printableWidth) / canvas.width;

      pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: isLetter ? 'letter' : 'a4',
      });

      // Smart Auto-Pagination & Single-Page Fitting:
      // Fit to 1 single page ONLY if content fits naturally within 1 page (naturalHeightMm <= printableHeight).
      // If content exceeds 1 page (e.g. multi-item consignments, long statements), DO NOT squish or compress!
      // Paginate cleanly onto Page 2, Page 3, etc. with full scale, font sizes, and unconstrained padding.
      const shouldFitToOnePage = fitToPage === true && naturalHeightMm <= printableHeight;

      if (shouldFitToOnePage) {
        let renderWidth = printableWidth;
        let renderHeight = (canvas.height * renderWidth) / canvas.width;

        if (renderHeight > printableHeight) {
          renderHeight = printableHeight;
          renderWidth = (canvas.width * renderHeight) / canvas.height;
        }

        const xOffset = marginMm + (printableWidth - renderWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, marginMm, renderWidth, renderHeight);
      } else {
        // Multi-page document (e.g. lengthy 10+ page ledger) with intelligent row gap slicing
        const canvasCtx = canvas.getContext('2d');
        const pageCanvasHeight = (canvas.width * printableHeight) / printableWidth;
        let renderedHeight = 0;
        let pageIdx = 0;

        while (renderedHeight < canvas.height) {
          const remainingHeight = canvas.height - renderedHeight;
          let currentSliceHeight = Math.min(pageCanvasHeight, remainingHeight);

          // If not the last slice, search for a clean row whitespace boundary
          if (remainingHeight > pageCanvasHeight && canvasCtx) {
            const idealSliceY = renderedHeight + pageCanvasHeight;
            const minSliceY = renderedHeight + pageCanvasHeight * 0.75;
            const cleanY = findCleanSlicePoint(
              canvasCtx,
              canvas.width,
              idealSliceY,
              minSliceY,
              idealSliceY
            );
            currentSliceHeight = cleanY - renderedHeight;
          }

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = currentSliceHeight;
          const pCtx = pageCanvas.getContext('2d');

          if (pCtx) {
            pCtx.fillStyle = '#ffffff';
            pCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            pCtx.drawImage(
              canvas,
              0,
              renderedHeight,
              canvas.width,
              currentSliceHeight,
              0,
              0,
              canvas.width,
              currentSliceHeight
            );

            const sliceImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
            const sliceHeightMm = (currentSliceHeight * printableWidth) / canvas.width;

            if (pageIdx > 0) {
              pdf.addPage(isLetter ? 'letter' : 'a4', orientation);
            }

            pdf.addImage(sliceImgData, 'JPEG', marginMm, marginMm, printableWidth, sliceHeightMm);
          }

          renderedHeight += currentSliceHeight;
          pageIdx++;
        }
      }
    }

    // 4. Create Blob & trigger download
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    if (autoDownload) {
      downloadBlob(pdfBlob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    }

    console.log(`[PDF Export Success] Generated full PDF: ${filename} (${pdfBlob.size} bytes)`);
    return {
      success: true,
      filename,
      blob: pdfBlob,
      blobUrl,
    };
  } catch (error: any) {
    console.error('[PDF Export Fatal Error]', error);
    return {
      success: false,
      filename,
      error: error?.message || 'Unknown PDF generation error',
    };
  } finally {
    // Cleanup staging DOM wrapper
    if (stagingWrapper && stagingWrapper.parentNode) {
      stagingWrapper.parentNode.removeChild(stagingWrapper);
    }
  }
}

/**
 * Fallback printing helper that uses an invisible iframe to prevent host window sandbox blocking
 */
export function printHtmlViaIframe(element: HTMLElement, title = 'PhoolMitra Document'): void {
  try {
    const existingIframe = document.getElementById('print-iframe-helper');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe-helper';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Copy styles from main document
    const headContent = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${headContent}
          <style>
            @media print {
              body { margin: 0; padding: 12px; background: #fff !important; }
              .no-print, .no-print-area { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 500);
  } catch (err) {
    console.error('[Iframe Print Error, falling back to window.print()]', err);
    window.print();
  }
}

/**
 * Checks if the current browser environment supports sharing files via the Web Share API
 */
export function canSharePdfFile(file?: File): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }
  if (!file) {
    return true;
  }
  try {
    return navigator.canShare ? navigator.canShare({ files: [file] }) : true;
  } catch {
    return false;
  }
}

/**
 * Converts a Blob to a File object with standard application/pdf mime type
 */
export function createPdfFile(blob: Blob, filename: string): File {
  const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  return new File([blob], finalFilename, { type: 'application/pdf' });
}

let isShareInProgress = false;
let globalShareTimer: any = null;

/**
 * Synchronously checks and acquires the global share lock.
 * Prevents rapid double-taps and concurrent PDF rendering + Web Share triggers.
 */
export function isGlobalShareLocked(): boolean {
  return isShareInProgress;
}

export function acquireGlobalShareLock(): boolean {
  if (isShareInProgress) {
    console.warn('[PDF Share Lock] A share action is already in progress. Ignoring duplicate trigger.');
    return false;
  }
  isShareInProgress = true;
  if (globalShareTimer) clearTimeout(globalShareTimer);
  // Auto safety release after 12 seconds
  globalShareTimer = setTimeout(() => {
    isShareInProgress = false;
  }, 12000);
  return true;
}

export function releaseGlobalShareLock(delayMs: number = 2500): void {
  if (globalShareTimer) clearTimeout(globalShareTimer);
  globalShareTimer = setTimeout(() => {
    isShareInProgress = false;
  }, delayMs);
}

/**
 * Shares a PDF File/Blob via the native Web Share API (attaching the actual PDF file for WhatsApp, etc.).
 * If direct file sharing is unsupported (e.g. desktop browsers without file share), it gracefully falls back
 * to downloading the PDF file and notifying the user.
 */
export async function sharePdfFile(options: SharePdfOptions): Promise<SharePdfResult> {
  // Guarantee lock is held during share execution
  if (!isShareInProgress) {
    acquireGlobalShareLock();
  }

  try {
    const {
      blob,
      filename,
      fallbackToDownload = true,
    } = options;

    let file = options.file;
    if (!file && blob) {
      file = createPdfFile(blob, filename);
    }

    if (!file) {
      return {
        shared: false,
        downloaded: false,
        method: 'error',
        error: 'No PDF file or blob provided for sharing',
      };
    }

    // 1. Feature detect Web Share API with file sharing capability
    if (canSharePdfFile(file)) {
      try {
        // CRITICAL: NEVER pass 'title' or 'text' alongside 'files' to navigator.share when sharing to WhatsApp.
        // On Android/iOS, passing text or title alongside files causes WhatsApp to create 2 separate share items (double sharing).
        // Pass ONLY the files array containing the File object.
        await navigator.share({
          files: [file],
        });
        return {
          shared: true,
          downloaded: false,
          method: 'web-share',
        };
      } catch (err: any) {
        // AbortError is thrown when the user intentionally closes/cancels the native share sheet
        if (err?.name === 'AbortError') {
          console.log('[Web Share] Share sheet dismissed by user.');
          return {
            shared: false,
            downloaded: false,
            method: 'cancelled',
          };
        }
        console.warn('[Web Share] Failed sharing via Web Share API, falling back to download:', err);
      }
    }

    // 2. Fallback when navigator.share({ files }) is unsupported
    if (fallbackToDownload && (blob || file)) {
      const finalBlob = blob || file;
      const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      downloadBlob(finalBlob, finalName);
      return {
        shared: false,
        downloaded: true,
        method: 'download-fallback',
        error: "Your browser doesn't support direct file sharing — the PDF has been downloaded so you can attach it in WhatsApp.",
      };
    }

    return {
      shared: false,
      downloaded: false,
      method: 'error',
      error: "Direct file sharing is not supported by your browser.",
    };
  } finally {
    // Release share lock after a delay to prevent rapid double-taps
    releaseGlobalShareLock(2500);
  }
}

/**
 * Renders an element to a pristine PDF and triggers direct native Web Share with PDF file attachment
 */
export async function exportAndSharePdf(
  element: HTMLElement | null,
  exportOptions: PdfExportOptions,
  shareText?: string
): Promise<SharePdfResult> {
  const exportResult = await exportElementToPdf(element, {
    ...exportOptions,
    autoDownload: false,
  });

  if (!exportResult.success || !exportResult.blob) {
    return {
      shared: false,
      downloaded: false,
      method: 'error',
      error: exportResult.error || 'Failed to render PDF for sharing.',
    };
  }

  return sharePdfFile({
    blob: exportResult.blob,
    filename: exportResult.filename,
    title: exportOptions.title || exportResult.filename,
    text: shareText,
    fallbackToDownload: true,
  });
}

