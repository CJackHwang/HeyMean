
import { GoogleGenAI } from "@google/genai";
import { Message, MessageSender } from '../types';

// NOTE: This service exclusively uses the Gemini API as requested.
// The 'customEndpoint' from settings is not used here.

const messageToContent = (msg: Message) => {
  const parts: any[] = [];
  
  // Add text part only if there is text.
  if (msg.text && msg.text.trim() !== '') {
    parts.push({ text: msg.text });
  }

  // FIX: Iterate over the `attachments` array instead of using a singular `attachment`.
  if (msg.attachments) {
    for (const attachment of msg.attachments) {
      try {
        // attachment.data is a data URL: "data:[<mediatype>];base64,<data>"
        const base64Data = attachment.data.split(',')[1];
        if (base64Data) {
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: attachment.type,
            },
          });
        }
      } catch (e) {
        console.error("Error processing attachment data from message:", e);
      }
    }
  }

  // Ensure there's at least one part to avoid errors. If text and attachment are empty, send an empty text part.
  if (parts.length === 0) {
      parts.push({ text: '' });
  }
  
  return {
    role: msg.sender === MessageSender.USER ? 'user' : 'model',
    parts,
  };
};

export const streamChatResponse = async (
  chatHistory: Message[],
  newMessage: Message,
  systemInstruction: string,
  onChunk: (text: string) => void
) => {
  if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set.");
    onChunk("Error: API key is not configured. Please contact the administrator.");
    return;
  }
  // As per guidelines, create a new GoogleGenAI instance right before making an API call
  // to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const model = 'gemini-2.5-flash';
  
  const history = chatHistory.map(messageToContent);
  const newContent = messageToContent(newMessage);

  const contents = [...history, newContent];

  try {
    const response = await ai.models.generateContentStream({
        model: model,
        contents: contents as any, // Type assertion due to complexity of history/parts
        config: {
            systemInstruction
        }
    });

    for await (const chunk of response) {
      if(chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    onChunk("Sorry, I encountered an error. Please try again.");
  }
};
