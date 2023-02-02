import type { PDFOptions, Browser } from 'puppeteer-core';
import { getBrowser } from './getBrowser';

export const PDF_OPTIONS: PDFOptions = {
  format: 'A4',
  printBackground: true,
};

export async function createPdf(html: string): Promise<Buffer> {
  let browser: Browser | null = null;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html);
    return await page.pdf(PDF_OPTIONS);
  } finally {
    if (browser) {
      browser.close();
    }
  }
}
