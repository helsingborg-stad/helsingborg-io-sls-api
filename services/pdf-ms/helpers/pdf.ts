import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';

import { getPropertyFromDottedString } from './objects';
import { TextNode, Font, Template, Answer } from './types';

const DEFAULT_TEXT_COLOR = rgb(0.05, 0.05, 0.05);
const CHANGED_CASE_VALUE_TEXT_COLOR = rgb(174 / 255, 11 / 255, 5 / 255);

async function loadPdfDocumentFonts(document: PDFDocument): Promise<Record<Font, PDFFont>> {
  try {
    const courierFont = await document.embedFont(StandardFonts.Courier);
    const timesRomanFont = await document.embedFont(StandardFonts.TimesRoman);
    const helveticaFont = await document.embedFont(StandardFonts.Helvetica);

    const fonts = {
      courier: courierFont,
      timesRoman: timesRomanFont,
      helvetica: helveticaFont,
    };

    return fonts;
  } catch (PDFDocumentError) {
    throw PDFDocumentError.message;
  }
}

function drawTextNodeOnPdfPage(
  textNode: TextNode,
  pdfPage: PDFPage,
  fonts: Record<Font, PDFFont>,
  defaultFontSize: number
) {
  const { x, y, text, fontSize, font, color, maxWidthInChars } = textNode;

  if (maxWidthInChars && text.length > maxWidthInChars) {
    const numLines = Math.ceil(text.length / maxWidthInChars);

    for (let line = 0; line < numLines; line++) {
      pdfPage.drawText(text.substring(maxWidthInChars * line, maxWidthInChars * (line + 1)), {
        x,
        y: y - line * (fontSize * 1.5),
        size: fontSize || defaultFontSize,
        font: fonts[font || 'helvetica'],
        color: color || DEFAULT_TEXT_COLOR,
      });
    }
  } else {
    pdfPage.drawText(text, {
      x,
      y,
      size: fontSize || defaultFontSize,
      font: fonts[font || 'helvetica'],
      color: color || DEFAULT_TEXT_COLOR,
    });
  }
}

function replaceTextInTextNode(textNode: TextNode, json: Record<string, any>, answers: Answer[]) {
  const captureStringInDoubleBrachesRegexPattern = /{{(.*?)}}/g;
  const templateStrings = [...textNode.text.matchAll(captureStringInDoubleBrachesRegexPattern)];
  const newTextNode: TextNode = { ...textNode };

  const newText = templateStrings.reduce((previous, currentRegexResult) => {
    const [fullMatch, capturingGroup] = currentRegexResult;
    const fieldId = capturingGroup.trim();
    const replacement = getPropertyFromDottedString(json, fieldId);

    if (replacement === undefined || replacement === 'undefined') {
      return previous.replace(fullMatch, '');
    }

    // Special logic for handling dates, based on the tags for the field including the keyword 'date'
    const answerObject = answers.find(answer => answer.field.id === fieldId);

    if (answerObject && answerObject.field.tags.includes('date')) {
      const date = new Date(answerObject.value);
      const dateYearMonthDay = date.toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });

      return previous.replace(fullMatch, dateYearMonthDay);
    }

    return previous.replace(fullMatch, replacement);
  }, textNode.text);

  newTextNode.text = newText;

  return newTextNode;
}

/** Takes a base pdf, a templateData object that tells us where to put the texts,
 * and a json from which we import the values. The changedValues and newValues
 * tells us if some values have changed since the last case, and if so lets us
 * mark those values in red.
 */
export async function modifyPdf(
  pdfBuffer: Buffer,
  template: Template,
  json: Record<string, any>,
  answers: Answer[],
  changedValues?: string[],
  newValues?: string[]
) {
  try {
    const document = await PDFDocument.load(pdfBuffer);
    const pages = document.getPages();
    const fonts = await loadPdfDocumentFonts(document);

    const replacedTextNodes = template.texts.map(textNode => {
      const replacedText = replaceTextInTextNode(textNode, json, answers);

      // use the valueId property and the newValues/changedValues to see if the property has changed,
      // and if so, change its color to mark the change.
      if (
        replacedText.valueId &&
        (newValues.includes(replacedText.valueId) || changedValues.includes(replacedText.valueId))
      ) {
        replacedText.color = CHANGED_CASE_VALUE_TEXT_COLOR;
      }

      return replacedText;
    });

    replacedTextNodes.forEach(textNode => {
      const page = pages[textNode.pageIndex || 0];
      drawTextNodeOnPdfPage(textNode, page, fonts, template.defaultFontSize);
    });

    const pdfDocumentInBytes = await document.save();

    return Buffer.from(pdfDocumentInBytes);
  } catch (PDFDocumentError) {
    throw PDFDocumentError.message;
  }
}
