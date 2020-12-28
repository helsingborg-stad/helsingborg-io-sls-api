import { getPropertyFromDottedString } from './objects';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { TextObject, Font, Template } from './types';

const loadFonts = async (document: PDFDocument): Promise<Record<Font, PDFFont>> => {
  const courierFont = await document.embedFont(StandardFonts.Courier);
  const timesRomanFont = await document.embedFont(StandardFonts.TimesRoman);
  const helveticaFont = await document.embedFont(StandardFonts.Helvetica);

  const fonts = {
    courier: courierFont,
    timesRoman: timesRomanFont,
    helvetica: helveticaFont,
  };
  return fonts;
};

/** Draws the text as specified in the textObject on top of the pdf page */
const renderTextOnPage = (
  textObject: TextObject,
  pdfPage: PDFPage,
  fonts: Record<Font, PDFFont>,
  defaultFontSize: number
) => {
  pdfPage.drawText(textObject.text, {
    x: textObject.x,
    y: textObject.y,
    size: textObject.size || defaultFontSize,
    font: fonts[textObject.font || 'helvetica'],
    color: textObject.color || rgb(0.05, 0.05, 0.05),
  });
};

const replaceTextInTextObject = (textObject: TextObject, json: Record<string, any>) => {
  const regex = /{{(.*?)}}/g;
  const templateStrings = [...textObject.text.matchAll(regex)];
  const newTextObject: TextObject = { ...textObject };

  const newText = templateStrings.reduce((prev, currentRegexResult) => {
    const replacement = getPropertyFromDottedString(json, currentRegexResult[1].trim());
    if (replacement === undefined || replacement === 'undefined'){
      return prev.replace(currentRegexResult[0], '');
    }
    return prev.replace(currentRegexResult[0], replacement);
  }, textObject.text);
  newTextObject.text = newText;
  return newTextObject;
};


/** Takes a base pdf, a templateData object that tells us where to put the texts,
 * and a jsonData object from which we import the values. */
export const modifyPdf = async (
  pdfBuffer: Buffer,
  template: Template,
  jsonData: Record<string, any>
) => {
  const document = await PDFDocument.load(pdfBuffer);
  const pages = document.getPages();
  const fonts = await loadFonts(document);

  const replacedTextObjects = template.texts.map(textObject =>
    replaceTextInTextObject(textObject, jsonData)
  );

  replacedTextObjects.forEach(textObject => {
    const page = pages[textObject.page || 0];
    renderTextOnPage(textObject, page, fonts, template.defaultFontSize);
  });

  const pdfBytes = await document.save();
  return Buffer.from(pdfBytes);
};
