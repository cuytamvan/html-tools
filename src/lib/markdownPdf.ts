import type { jsPDF as JsPdfType } from 'jspdf';

const PDF_MARGIN_MM = 12;

export function sanitizePdfFilename(name: string, fallback = 'markdown.pdf'): string {
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  const withExt = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
  const safe = withExt.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim();
  return safe || fallback;
}

export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as JsPdfType;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PDF_MARGIN_MM * 2;
  const contentHeight = pageHeight - PDF_MARGIN_MM * 2;
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/png');

  let offsetY = 0;
  let page = 0;

  while (offsetY < imgHeight) {
    if (page > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', PDF_MARGIN_MM, PDF_MARGIN_MM - offsetY, imgWidth, imgHeight);
    offsetY += contentHeight;
    page += 1;
  }

  pdf.save(sanitizePdfFilename(filename));
}
