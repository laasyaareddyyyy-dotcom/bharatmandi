import jsPDF from 'jspdf';
import { buildFormCData, FormCData, BuildFormCOptions } from './formCDataBuilder';
import { generateVectorParchiPdf, downloadVectorPdf } from './vectorPdf';
import { exportAndSharePdf, printHtmlViaIframe, sharePdfFile } from './pdfExport';

export interface GenerateFormCPdfOptions {
  autoDownload?: boolean;
  autoShare?: boolean;
  autoPrint?: boolean;
  elementRef?: HTMLElement | null;
}

export interface GeneratedFormCPdfResult {
  data: FormCData;
  doc: jsPDF;
  filename: string;
  download: () => void;
  share: () => Promise<any>;
  print: () => void;
}

/**
 * Reusable function to generate, download, share, or print Form C Mandi Sale Parchi PDF.
 * Matches exact layout, fonts, colors, and math defined in FormC-GRS-2026-10-31-1.pdf.
 * Can be called from any screen in the Bharat Mandi app.
 */
export async function generateFormCPdf(
  parchiData: BuildFormCOptions | FormCData,
  options: GenerateFormCPdfOptions = {}
): Promise<GeneratedFormCPdfResult> {
  const data: FormCData =
    'parchiNumber' in parchiData && 'shopProfile' in parchiData
      ? (parchiData as FormCData)
      : buildFormCData(parchiData as BuildFormCOptions);

  // Generate vector PDF via jsPDF matching official Form C layout
  const doc = generateVectorParchiPdf(data, { autoDownload: false });
  const filename = data.pdfFileName;

  const download = () => downloadVectorPdf(doc, filename);

  const share = async () => {
    const blob = doc.output('blob');
    if (options.elementRef) {
      return exportAndSharePdf(options.elementRef, { filename, title: data.formCNumber });
    }
    return sharePdfFile({ blob, filename, title: data.formCNumber });
  };

  const print = () => {
    if (options.elementRef) {
      printHtmlViaIframe(options.elementRef, data.formCNumber);
    } else {
      doc.autoPrint();
      const blobUrl = URL.createObjectURL(doc.output('blob'));
      window.open(blobUrl, '_blank');
    }
  };

  if (options.autoDownload) {
    download();
  }
  if (options.autoShare) {
    await share();
  }
  if (options.autoPrint) {
    print();
  }

  return {
    data,
    doc,
    filename,
    download,
    share,
    print,
  };
}

export default generateFormCPdf;
