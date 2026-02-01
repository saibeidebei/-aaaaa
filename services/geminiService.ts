
import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleBlock, CorrectionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const correctionSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      index: {
        type: Type.INTEGER,
        description: "字幕块的索引编号。",
      },
      fixedText: {
        type: Type.STRING,
        description: "修正后的字幕文本。",
      },
      reason: {
        type: Type.STRING,
        description: "修改原因的简短中文说明。",
      },
    },
    required: ["index", "fixedText", "reason"],
  },
};

export const analyzeSubtitles = async (
  blocks: SubtitleBlock[]
): Promise<CorrectionResult[]> => {
  if (blocks.length === 0) return [];

  const prompt = `
    你是一位专业的字幕编辑专家。我将为你提供一批 SRT 字幕块。
    请分析文本中常见的 ASR（自动语音识别）错误：
    1. 同音字错误（例如：中文的“的事得”、英文的“there/their”）。
    2. 导致意思改变的标点缺失或错误。
    3. 在当前上下文语境下不通顺的词汇。
    4. 专有名词的大小写或拼写错误。
    
    仅返回需要修正的字幕块列表。
    如果某个字幕块已经是完美的，请不要将其包含在响应中。
    请务必保持原有的语言风格。
    请用中文简述修正原因。

    待分析字幕块：
    ${blocks.map(b => `[${b.index}] ${b.text}`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: correctionSchema,
        thinkingConfig: { thinkingBudget: 4000 }
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result as CorrectionResult[];
  } catch (error) {
    console.error("Gemini 分析失败:", error);
    throw error;
  }
};
