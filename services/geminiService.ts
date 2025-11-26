import { GoogleGenAI, Modality } from "@google/genai";
import { ExamResult, Student } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const checkApiKey = () => {
  if (!apiKey) throw new Error("API Key is missing.");
};

// --- Feature: Fast AI Responses (Gemini 2.5 Flash Lite) ---
export const analyzePerformanceFast = async (student: Student, results: ExamResult[], institutionType: string, attendancePercent?: number): Promise<string> => {
  try {
    checkApiKey();
    const resultsSummary = results.map(r => 
      `- ${r.examName}: ${r.subject} (${r.marksObtained}/${r.totalMarks})`
    ).join('\n');

    const attendanceContext = attendancePercent !== undefined 
      ? `Attendance: ${attendancePercent}%.` 
      : "Attendance data not available.";

    const prompt = `
      You are a quick academic advisor. Briefly summarize the performance of ${student.name} (${institutionType}).
      ${attendanceContext}
      
      Grades Data:
      ${resultsSummary}
      
      Output: A concise 3-sentence summary. If attendance is low (<75%), warn about its impact on grades. Mention one strength and one improvement area.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Fast Analysis Error:", error);
    return "Service unavailable.";
  }
};

// --- Feature: Thinking Mode (Gemini 3 Pro Preview) ---
export const analyzeCareerDeep = async (student: Student, results: ExamResult[]): Promise<string> => {
  try {
    checkApiKey();
    const resultsSummary = results.map(r => 
      `- ${r.subject}: ${r.marksObtained}/${r.totalMarks}`
    ).join('\n');

    const prompt = `
      Student: ${student.name}
      Grades:
      ${resultsSummary}
      
      Task: Provide a detailed, deep-dive career path analysis. 
      1. Analyze the subjects with highest potential.
      2. Suggest 3 specific college majors or career paths.
      3. Outline a strategic study plan for the next 6 months to prepare for competitive exams suitable for their profile.
      
      Be thorough and logic-driven.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 } // Max thinking for deep reasoning
      }
    });
    return response.text || "Could not generate deep analysis.";
  } catch (error) {
    console.error("Deep Thinking Error:", error);
    return "Deep analysis failed. Please try again.";
  }
};

// --- Feature: Generate Speech (Gemini 2.5 Flash TTS) ---
export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    checkApiKey();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return audioData || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

// Helper to play the Raw PCM audio from Gemini
export const playRawAudio = async (base64Audio: string) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext({sampleRate: 24000});

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (e) {
    console.error("Audio Playback Error", e);
  }
};

// --- Feature: Image Editing (Gemini 2.5 Flash Image) ---
export const editImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    checkApiKey();
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64, 
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Edit Error:", error);
    return null;
  }
};
