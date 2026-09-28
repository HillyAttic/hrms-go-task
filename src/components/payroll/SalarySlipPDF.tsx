import { MONTH_NAMES, type EmployeeSalary, type PayrollSettings, type SalarySlipTemplate } from '@/types/payroll.types';
import { SalarySlipPreview } from '@/components/payroll/SalarySlipPreview';

const RENDER_DELAY_MS = 500;

/**
 * The sheet is A4-wide, so 3× puts ~2380px across the page — about 288dpi, i.e.
 * print-sharp. 4× would clear 300dpi but doubles the canvas memory for a
 * difference no page can show.
 */
const RASTER_SCALE = 3;

/**
 * The letterhead art is a photographic gradient, which a lossless PNG stores at
 * ~32MB for one page — undownloadable, let alone emailable. At 288dpi a JPEG at
 * this quality is visually identical here and around a hundredth the size.
 */
const RASTER_TYPE = 'JPEG' as const;
const JPEG_QUALITY = 0.92;

function encodeRaster(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/**
 * Rasterises the slip preview and saves it as a PDF.
 *
 * react / react-dom / html2canvas / jspdf are all imported dynamically so none of
 * them reach the initial bundle, and the offscreen tree is always torn down —
 * leaking a hidden 210mm DOM subtree per download is a real bug, not a nicety.
 */
export async function generateSalarySlipPDF(
  slip: EmployeeSalary,
  settings: PayrollSettings,
  template?: SalarySlipTemplate | null
): Promise<void> {
  const [react, { createRoot }, { default: html2canvas }, { jsPDF }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('html2canvas'),
    import('jspdf'),
  ]);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = '#ffffff';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    root.render(
      react.createElement(SalarySlipPreview, { slip, settings, template, forPDF: true })
    );
    await new Promise((resolve) => setTimeout(resolve, RENDER_DELAY_MS));

    const node = container.querySelector<HTMLElement>('#salary-slip-preview');
    if (!node) throw new Error('Salary slip preview did not render');

    const canvas = await html2canvas(node, {
      scale: RASTER_SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // The sheet *is* a full A4 page of letterhead art, so it goes down edge to
    // edge. Insetting it by a margin shrank the whole slip and floated it in
    // white space with the art's own margins doubled up inside.
    const pdfWidth = pageWidth;
    const imageHeight = (canvas.height * pdfWidth) / canvas.width;

    // Half a millimetre of slack: a hair over one page would otherwise spill a
    // near-blank second page.
    if (imageHeight <= pageHeight + 0.5) {
      pdf.addImage(encodeRaster(canvas), RASTER_TYPE, 0, 0, pdfWidth, imageHeight);
    } else {
      // Taller than one page: slice the canvas into page-height chunks.
      const sliceHeightPx = Math.floor((pageHeight * canvas.width) / pdfWidth);
      let offsetPx = 0;
      let isFirstPage = true;

      while (offsetPx < canvas.height) {
        const chunkPx = Math.min(sliceHeightPx, canvas.height - offsetPx);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = chunkPx;

        const context = pageCanvas.getContext('2d');
        if (!context) break;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(canvas, 0, offsetPx, canvas.width, chunkPx, 0, 0, canvas.width, chunkPx);

        if (!isFirstPage) pdf.addPage();
        pdf.addImage(
          encodeRaster(pageCanvas),
          RASTER_TYPE,
          0,
          0,
          pdfWidth,
          (chunkPx * pdfWidth) / canvas.width
        );

        isFirstPage = false;
        offsetPx += chunkPx;
      }
    }

    const employeeCode = slip.employeeCode || slip.employeeId;
    const monthName = MONTH_NAMES[slip.month] ?? String(slip.month);
    pdf.save(`SalarySlip_${employeeCode}_${monthName}_${slip.year}.pdf`);
  } finally {
    root.unmount();
    container.remove();
  }
}
