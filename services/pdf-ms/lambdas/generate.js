import chromium from 'chrome-aws-lambda';
import to from 'await-to-js';

import { s3Client } from '../../../libs/S3';
import { putEvent } from '../../../libs/awsEventBridge';

const PDF_OPTIONS = {
  format: 'A4',
  printBackground: true,
  margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
};

export async function main(event) {
  const { pdfStorageBucketKey, resourceId } = event.detail;

  const [executablePathError, executablePath] = await to(chromium.executablePath);
  if (executablePathError) {
    console.error(executablePathError);
    return false;
  }

  const [getHtmlFileError, htmlFile] = await to(
    s3Client
      .getObject({
        Bucket: process.env.PDF_STORAGE_BUCKET_NAME,
        Key: pdfStorageBucketKey,
      })
      .promise()
  );
  if (getHtmlFileError) {
    console.error(getHtmlFileError);
    return false;
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
    console.error(puppeteerLaunchError);
    return false;
  }

  const [newPageError, page] = await to(puppeteerBrowser.newPage());
  if (newPageError) {
    console.error(newPageError);
    return false;
  }

  const htmlString = htmlFile.Body.toString();
  page.setContent(htmlString);

  const [generatePdfError, pdfBuffer] = await to(page.pdf(PDF_OPTIONS));
  if (generatePdfError) {
    console.error(generatePdfError);
    return false;
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
    console.error(putPdfError);
    return false;
  }

  if (pdfOutputObject) {
    const [putEventError] = await to(
      putEvent({ resourceId, pdfOutputObject }, 'pdfMsGenerateSuccess', 'pdfMs.generate')
    );
    if (putEventError) {
      console.error(putEventError);
      return false;
    }
  }

  if (puppeteerBrowser !== null) {
    await puppeteerBrowser.close();
  }
}
