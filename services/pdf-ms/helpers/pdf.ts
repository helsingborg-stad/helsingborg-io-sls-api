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
  const { x, y, text, fontSize, font, color, maxWidthInChars } = textObject;
  if (maxWidthInChars && text.length > maxWidthInChars) {
    const numLines = Math.ceil(text.length / maxWidthInChars);
    for (let line = 0; line < numLines; line++) {
      pdfPage.drawText(text.substring(maxWidthInChars * line, maxWidthInChars * (line + 1)), {
        x,
        y: y - line * (fontSize * 1.5),
        size: fontSize || defaultFontSize,
        font: fonts[font || 'helvetica'],
        color: color || rgb(0.05, 0.05, 0.05),
      });
    }
  } else {
    pdfPage.drawText(text, {
      x,
      y,
      size: fontSize || defaultFontSize,
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
    const [fullMatch, capturingGroup] = currentRegexResult;
    const replacement = getPropertyFromDottedString(json, capturingGroup.trim());
    if (replacement === undefined || replacement === 'undefined') {
      return previous.replace(fullMatch, '');
    }
    return previous.replace(fullMatch, replacement);
  }, textObject.text);
  newTextObject.text = newText;
  return newTextObject;
};

/** Takes a base pdf, a templateData object that tells us where to put the texts,
 * and a json from which we import the values. The changedValues and newValues
 * tells us if some values have changed since the last case, and if so lets us
 * mark those values in red.
 */
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
    // use the valueId property and the newValues/changedValues to see if the property has changed,
    // and if so, set its color to red to mark the change.
    if (
      replacedText.valueId &&
      (newValues.includes(replacedText.valueId) || changedValues.includes(replacedText.valueId))
    ) {
      replacedText.color = rgb(174 / 255, 11 / 255, 5 / 255);
    }
    return replacedText;
  });

  replacedTextObjects.forEach(textObject => {
    const page = pages[textObject.pageIndex || 0];
    renderTextOnPage(textObject, page, fonts, template.defaultFontSize);
  });

  const pdfBytes = await document.save();
  return Buffer.from(pdfBytes);
};
