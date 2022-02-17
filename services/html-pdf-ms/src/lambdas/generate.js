import chromium from 'chrome-aws-lambda';
import to from 'await-to-js';
import uuid from 'uuid';

import { s3Client } from '../libs/S3';
import { putEvent } from '../libs/awsEventBridge';

const PDF_OPTIONS = {
  format: 'A4',
  printBackground: true,
};

export async function main(event) {
  const { pdfStorageBucketKey, keys } = event.detail;

  const [getS3ObjectError, s3Object] = await to(
    s3Client
      .getObject({
        Bucket: process.env.PDF_STORAGE_BUCKET_NAME,
        Key: pdfStorageBucketKey,
      })
      .promise()
  );
  if (getS3ObjectError) {
    console.error(getS3ObjectError);
    return false;
  }

  const htmlString = s3Object.Body.toString();

  const [htmlToPdfError, pdfBuffer] = await to(htmlToPdf(htmlString));
  if (htmlToPdfError) {
    console.error(htmlToPdfError);
    return false;
  }
  const pdfId = uuid.v4();
  const pdfBucketKey = `pdf/${pdfId}.pdf`;
  const [putPdfError, pdfOutputObject] = await to(
    s3Client
      .putObject({
        Bucket: process.env.PDF_STORAGE_BUCKET_NAME,
        Key: pdfBucketKey,
        Body: pdfBuffer,
      })
      .promise()
  );
  if (putPdfError) {
    console.error(putPdfError);
    return false;
  }

  if (pdfOutputObject) {
    const [putEventError] = await to(
      putEvent(
        { keys, pdfStorageBucketKey: pdfBucketKey },
        'PdfMsGenerateSuccess',
        'pdfMs.generate'
      )
    );
    if (putEventError) {
      console.error(putEventError);
      return false;
    }
  }

  return true;
}

async function htmlToPdf(html) {
  let browser = null;
  try {
    const executablePath = await chromium.executablePath;

    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf(PDF_OPTIONS);

    return pdf;
  } finally {
    if (browser !== null) {
      browser.close();
    }
  }
}
