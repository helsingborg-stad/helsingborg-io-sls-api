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
  const { x, y, text, size, font, color, maxWidthInChars } = textObject;
  if (maxWidthInChars && text.length > maxWidthInChars) {
    const numLines = Math.ceil(text.length / maxWidthInChars);
    for (let line = 0; line < numLines; line++) {
      pdfPage.drawText(text.substring(maxWidthInChars * line, maxWidthInChars * (line + 1)), {
        x,
        y: y - line * (size * 1.5),
        size: size || defaultFontSize,
        font: fonts[font || 'helvetica'],
        color: color || rgb(0.05, 0.05, 0.05),
      });
    }
  } else {
    pdfPage.drawText(text, {
      x,
      y,
      size: size || defaultFontSize,
      font: fonts[font || 'helvetica'],
      color: color || rgb(0.05, 0.05, 0.05),
    });
  }
};

const replaceTextInTextObject = (textObject: TextObject, json: Record<string, any>) => {
  const regex = /{{(.*?)}}/g;
  const templateStrings = [...textObject.text.matchAll(regex)];
  const newTextObject: TextObject = { ...textObject };

  const newText = templateStrings.reduce((previous, currentRegexResult) => {
    const replacement = getPropertyFromDottedString(json, currentRegexResult[1].trim());
    if (replacement === undefined || replacement === 'undefined') {
      return previous.replace(currentRegexResult[0], '');
    }
    return previous.replace(currentRegexResult[0], replacement);
  }, textObject.text);
  newTextObject.text = newText;
  return newTextObject;
};

/** Takes a base pdf, a templateData object that tells us where to put the texts,
 * and a json from which we import the values. */
export const modifyPdf = async (
  pdfBuffer: Buffer,
  template: Template,
  json: Record<string, any>,
  changedValues?: string[],
  newValues?: string[]
) => {
  const document = await PDFDocument.load(pdfBuffer);
  const pages = document.getPages();
  const fonts = await loadFonts(document);

  const replacedTextObjects = template.texts.map(textObject => {
    const replacedText = replaceTextInTextObject(textObject, json);
    if (
      replacedText?.valueId &&
      (newValues.includes(replacedText.valueId) || changedValues.includes(replacedText.valueId))
    ) {
      replacedText.color = rgb(174, 11, 5);
    }
    return replacedText;
  });

  replacedTextObjects.forEach(textObject => {
    const page = pages[textObject.page || 0];
    renderTextOnPage(textObject, page, fonts, template.defaultFontSize);
  });

  const pdfBytes = await document.save();
  return Buffer.from(pdfBytes);
};
