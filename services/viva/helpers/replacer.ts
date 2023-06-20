interface ReplacerParams {
  source: string;
  tagert: string;
  pattern: string;
}

export default function replacer({ source, tagert, pattern }: ReplacerParams): string {
  const re = new RegExp(`\\${pattern}`, 'g');
  return source.replace(re, tagert);
}
