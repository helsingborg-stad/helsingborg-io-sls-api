import chromium from 'chrome-aws-lambda';
import to from 'await-to-js';

import { s3Client } from '../../../libs/S3';
import { putEvent } from '../../../libs/awsEventBridge';

export async function main(event) {
  const { pdfStorageBucketKey, id } = event.detail;

  const executablePath = event.isOffline
    ? './node_modules/puppeteer/.local-chromium/mac-674921/chrome-mac/Chromium.app/Contents/MacOS/Chromium'
    : await chromium.executablePath;

  const [getHtmlFileError, htmlFile] = await to(
    s3Client
      .getObject({
        Bucket: process.env.PDF_STORAGE_BUCKET_NAME,
        Key: pdfStorageBucketKey,
      })
      .promise()
  );
  if (getHtmlFileError) {
    throw getHtmlFileError;
  }

  const [puppeteerLaunchError, puppeteerBrowser] = await to(
    chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    })
  );
  if (puppeteerLaunchError) {
    throw puppeteerLaunchError;
  }

  const [newPageError, page] = await to(puppeteerBrowser.newPage());
  if (newPageError) {
    throw newPageError;
  }
  const htmlString = `${htmlFile.Body}`;
  page.setContent(htmlString);

  const [generatePdfError, pdfBuffer] = await to(
    page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    })
  );
  if (generatePdfError) {
    throw generatePdfError;
  }

  const pdfBucketKey = `pdf/${Date.now()}.pdf`;
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
    throw putPdfError;
  }

  if (pdfOutputObject) {
    const [putEventError] = await to(
      putEvent({ id, pdfOutputObject }, 'pdfMsGenerateSuccess', 'pdfMs.generatedPdf')
    );
    if (putEventError) {
      throw putEventError;
    }
  }

  if (puppeteerBrowser !== null) {
    await puppeteerBrowser.close();
  }
}
