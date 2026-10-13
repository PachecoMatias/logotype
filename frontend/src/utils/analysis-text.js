export function splitIntoSentencePairs(value) {
  const sentences = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?]+(?:[.!?]+|$)/g);

  if (!sentences) return [];

  const paragraphs = [];
  for (let index = 0; index < sentences.length; index += 2) {
    paragraphs.push(
      sentences
        .slice(index, index + 2)
        .join(" ")
        .trim(),
    );
  }
  return paragraphs;
}
