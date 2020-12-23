import { getPropertyFromDottedString } from './objects';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { TextObject, Font, TemplateData } from './types';

const loadFonts = async (pdfDoc: PDFDocument): Promise<Record<Font, PDFFont>> => {
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fonts = {
    courier: courierFont,
    timesRoman: timesRomanFont,
    helvetica: helveticaFont,
  };
  return fonts;
};

/** Draws the text as specified in the textObject on top of the pdf page */
const renderTextObject = (
  textObject: TextObject,
  pdfPage: PDFPage,
  fonts: Record<Font, PDFFont>,
  defaultFontSize: number
) => {
  pdfPage.drawText(textObject.text, {
    x: textObject.x,
    y: textObject.y,
    size: textObject.fontSize || defaultFontSize,
    font: fonts[textObject.font || 'helvetica'],
    color: textObject.color || rgb(0.05, 0.05, 0.05),
  });
};

const replaceTextInTextObject = (textObject: TextObject, jsonData: Record<string, any>) => {
  const regex = /{{(.*?)}}/g;
  const templateStrings = [...textObject.text.matchAll(regex)];
  const newTextObject: TextObject = { ...textObject };

  const newText = templateStrings.reduce((prev, currentRegexResult) => {
    const replacementValue = getPropertyFromDottedString(jsonData, currentRegexResult[1].trim());
    return prev.replace(currentRegexResult[0], replacementValue);
  }, textObject.text);
  newTextObject.text = newText;
  return newTextObject;
};

/** Takes a base pdf, a templateData object that tells us where to put the texts,
 * and a jsonData object from which we import the values. */
export const modifyPdf = async (
  pdfBuffer: Buffer,
  templateData: TemplateData,
  jsonData: Record<string, any>
) => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const fonts = await loadFonts(pdfDoc);

  const replacedTextObjects = templateData.textObjects.map(textObject =>
    replaceTextInTextObject(textObject, jsonData)
  );

  replacedTextObjects.forEach(textObject => {
    const page = pages[textObject.page || 0];
    renderTextObject(textObject, page, fonts, templateData.defaultFontSize);
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};
