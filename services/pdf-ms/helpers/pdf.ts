import { getPropertyFromDottedString } from './objects';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { TextNode, Font, Template, AnswerObject } from './types';

const defaultTextColor = rgb(0.05, 0.05, 0.05);
const changedTextColor = rgb(174 / 255, 11 / 255, 5 / 255);

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

/** Draws the text as specified in the textNode on the pdf page */
const renderTextOnPage = (
  textNode: TextNode,
  pdfPage: PDFPage,
  fonts: Record<Font, PDFFont>,
  defaultFontSize: number
) => {
  const { x, y, text, fontSize, font, color, maxWidthInChars } = textNode;
  if (maxWidthInChars && text.length > maxWidthInChars) {
    const numLines = Math.ceil(text.length / maxWidthInChars);
    for (let line = 0; line < numLines; line++) {
      pdfPage.drawText(text.substring(maxWidthInChars * line, maxWidthInChars * (line + 1)), {
        x,
        y: y - line * (fontSize * 1.5),
        size: fontSize || defaultFontSize,
        font: fonts[font || 'helvetica'],
        color: color || defaultTextColor,
      });
    }
  } else {
    pdfPage.drawText(text, {
      x,
      y,
      size: fontSize || defaultFontSize,
      font: fonts[font || 'helvetica'],
      color: color || defaultTextColor,
    });
  }
};

const replaceTextInTextNode = (
  textNode: TextNode,
  json: Record<string, any>,
  answerArray: AnswerObject[]
) => {
  // This regex matches any string inside double braces, i.e. things like "{{hello}}" or "{{_x_  }}".
  // Everything inside the braces becomes a capturing group.
  const regex = /{{(.*?)}}/g;
  const templateStrings = [...textNode.text.matchAll(regex)];
  const newTextNode: TextNode = { ...textNode };

  const newText = templateStrings.reduce((previous, currentRegexResult) => {
    const [fullMatch, capturingGroup] = currentRegexResult;
    const fieldId = capturingGroup.trim();
    const replacement = getPropertyFromDottedString(json, fieldId);
    if (replacement === undefined || replacement === 'undefined') {
      return previous.replace(fullMatch, '');
    }
    // Special logic for handling dates, based on the tags for the field including the keyword 'date'
    const answerObject = answerArray.find(answer => answer.field.id === fieldId);
    if (answerObject && answerObject.field.tags.includes('date')) {
      const dateFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
      const date = new Date(answerObject.value);
      const dateString = date.toLocaleDateString('sv-SE', dateFormatOptions);
      return previous.replace(fullMatch, dateString);
    }

    return previous.replace(fullMatch, replacement);
  }, textNode.text);
  newTextNode.text = newText;
  return newTextNode;
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
  answerArray: AnswerObject[],
  changedValues?: string[],
  newValues?: string[]
) => {
  const document = await PDFDocument.load(pdfBuffer);
  const pages = document.getPages();
  const fonts = await loadFonts(document);

  const replacedTextNodes = template.texts.map(textNode => {
    const replacedText = replaceTextInTextNode(textNode, json, answerArray);
    // use the valueId property and the newValues/changedValues to see if the property has changed,
    // and if so, change its color to mark the change.
    if (
      replacedText.valueId &&
      (newValues.includes(replacedText.valueId) || changedValues.includes(replacedText.valueId))
    ) {
      replacedText.color = changedTextColor;
    }
    return replacedText;
  });

  replacedTextNodes.forEach(textNode => {
    const page = pages[textNode.pageIndex || 0];
    renderTextOnPage(textNode, page, fonts, template.defaultFontSize);
  });

  const pdfBytes = await document.save();
  return Buffer.from(pdfBytes);
};
