interface ReplacerParams {
  source: string;
  tagert: string;
  pattern: string;
}

export default function replacer({ source, tagert, pattern }: ReplacerParams): string {
  return source.replace(`/${pattern}/g`, tagert);
}
