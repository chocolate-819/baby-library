import { GoogleGenAI, Type } from '@google/genai';
import { PatternColorRequirement } from './types';

// 【重要说明】
// 纯前端网页（运行在用户的手机/电脑浏览器中）是无法直接获取或使用 Cloud Run 的 ADC (Application Default Credentials) 的。
// ADC 机制仅适用于服务器端环境（如 Node.js, Python 等）。
// @google/genai SDK 在浏览器环境中检测到没有 apiKey 时会直接抛出致命错误，导致整个网页白屏崩溃。
// 为了让您的网页能正常渲染，这里必须传入一个占位符 apiKey。
// 
// 【正确的生产环境架构】
// 既然您部署在 Cloud Run，您需要将 Cloud Run 作为一个后端服务（例如使用 Node.js/Express）：
// 1. 在 Cloud Run 的 Node.js 代码中使用 ADC 初始化 GoogleGenAI（此时不需要传 apiKey）。
// 2. 暴露一个 API 接口（如 POST /api/analyze）。
// 3. 前端 React 代码通过 fetch('/api/analyze') 将图片发给您的 Cloud Run 后端。
// 4. 后端调用 Vertex AI 后，将结果返回给前端。
const ai = new GoogleGenAI({ apiKey: 'placeholder-to-prevent-browser-crash', vertexai: true });

export const analyzePatternImage = async (base64Image: string, mimeType: string): Promise<PatternColorRequirement[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this Perler bead / pixel art pattern image. 
            CRITICAL INSTRUCTION: 
            1. First, look for explicit text labels on the pattern itself (e.g., 'A3', 'B5', 'C12'). 
            2. Look carefully for a summary table or list, usually at the bottom or side, that lists the color codes and their required quantities. 
            3. If you find these explicit codes and numbers, use them directly for the 'colorName' and 'count'.
            4. If no explicit codes are found, then identify distinct colors visually and count them.
            Return the result as a JSON array.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: "List of colors and their required quantities found in the pattern.",
          items: {
            type: Type.OBJECT,
            properties: {
              colorName: {
                type: Type.STRING,
                description: "The explicit color code found in the image (e.g., 'A3', 'B12') or a descriptive name if no code is found.",
              },
              hexCode: {
                type: Type.STRING,
                description: "The closest standard hex color code for this color, starting with # (e.g., '#FF0000').",
              },
              count: {
                type: Type.INTEGER,
                description: "The exact number of beads/pixels of this color required.",
              },
            },
            required: ["colorName", "hexCode", "count"],
          },
        },
      },
    });

    const jsonStr = response.text.trim();
    if (!jsonStr) {
      throw new Error("Gemini 返回了空数据");
    }

    const parsedData = JSON.parse(jsonStr) as PatternColorRequirement[];
    return parsedData;
  } catch (error: any) {
    console.error("Error analyzing pattern with Gemini:", error);
    const errorMessage = error?.message || "未知错误";
    throw new Error(`分析图纸失败 (${errorMessage})。请注意：纯前端应用无法直接使用 Cloud Run 身份验证，需配置后端接口。`);
  }
};
