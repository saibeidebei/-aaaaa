
import { SubtitleBlock } from '../types';

export const parseSRT = (content: string): SubtitleBlock[] => {
  const blocks: SubtitleBlock[] = [];
  const rawBlocks = content.trim().split(/\n\s*\n/);

  rawBlocks.forEach((raw, idx) => {
    const lines = raw.split(/\n/);
    if (lines.length >= 3) {
      const indexStr = lines[0].trim();
      const timeLine = lines[1].trim();
      const text = lines.slice(2).join('\n').trim();

      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (timeMatch) {
        blocks.push({
          id: idx,
          index: parseInt(indexStr),
          startTime: timeMatch[1],
          endTime: timeMatch[2],
          text: text,
          originalText: text
        });
      }
    }
  });

  return blocks;
};

export const stringifySRT = (blocks: SubtitleBlock[]): string => {
  return blocks
    .map((block) => {
      return `${block.index}\n${block.startTime} --> ${block.endTime}\n${block.text}\n`;
    })
    .join('\n');
};
