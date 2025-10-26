
import { GoogleGenAI } from "@google/genai";
import { Message, MessageSender, ApiProvider, Attachment } from '../types';

// Helper to convert messages to content format for Gemini and OpenAI
const messageToContent = (msg: Message) => {
  const parts: any[] = [];
  
  if (msg.text && msg.text.trim() !== '') {
    parts.push({ text: msg.text });
  }

  if (msg.attachments) {
    for (const att of msg.attachments) {
        try {
          // attachment.data is a data URL: "data:[<mediatype>];base64,<data>"
          const base64Data = att.data.split(',')[1];
          if (base64Data) {
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: att.type,
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

// Represents a single part in an OpenAI multimodal message.
type OpenAITextContentPart = { type: 'text'; text: string; };
type OpenAIImageContentPart = { type: 'image_url'; image_url: { url: string; }; };
type OpenAIContentPart = OpenAITextContentPart | OpenAIImageContentPart;

const getTextFromDataUrl = async (dataUrl: string): Promise<string> => {
    try {
        const response = await fetch(dataUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch data URL: ${response.statusText}`);
        }
        return response.text();
    } catch (error) {
        console.error("Error fetching text from data URL:", error);
        // Fallback for environments where fetch might not support data URLs directly
        try {
            const base64 = dataUrl.split(',')[1];
            return atob(base64);
        } catch (decodeError) {
             console.error("Error decoding base64 from data URL:", decodeError);
             return ""; // Return empty string if all fails
        }
    }
};

// Converts internal message history to OpenAI chat message format
const messagesToOpenAIChatFormat = async (messages: Message[], systemInstruction: string) => {
  const openAIMessages: any[] = [];

  // System instruction always comes first
  if (systemInstruction) {
    openAIMessages.push({ role: 'system', content: systemInstruction });
  }

  for (const msg of messages) {
    const role = msg.sender === MessageSender.USER ? 'user' : 'assistant';

    // Assistants don't have attachments, so their content is always text
    if (role === 'assistant') {
        openAIMessages.push({ role, content: msg.text || '' });
        continue;
    }

    // Handle user messages, which can have attachments
    const contentParts: (OpenAITextContentPart | OpenAIImageContentPart)[] = [];
    let fileTextContent = '';

    if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
            if (att.type.startsWith('image/')) {
                contentParts.push({
                    type: 'image_url',
                    image_url: { url: att.data }
                });
            } else if (att.type.startsWith('text/')) {
                const text = await getTextFromDataUrl(att.data);
                fileTextContent += `\n\n--- Attachment: ${att.name} ---\n${text}`;
            }
            // PDFs are filtered out at the input level for OpenAI
        }
    }
    
    const finalUserText = (msg.text || '') + fileTextContent;
    contentParts.unshift({ type: 'text', text: finalUserText });

    // OpenAI API expects 'content' to be a string if there are no images.
    const hasImages = contentParts.some(p => p.type === 'image_url');
    const content = hasImages ? contentParts : finalUserText;

    openAIMessages.push({ role, content });
  }

  return openAIMessages;
};


export const streamChatResponse = async (
  chatHistory: Message[],
  newMessage: Message,
  systemInstruction: string,
  selectedApiProvider: ApiProvider,
  geminiApiKey: string,
  openAiApiKey: string,
  openAiModel: string,
  openAiBaseUrl: string,
  onChunk: (text: string) => void
) => {
  // Check for API key based on selected provider
  const effectiveGeminiKey = geminiApiKey || process.env.API_KEY;
  if (selectedApiProvider === ApiProvider.GEMINI && !effectiveGeminiKey) {
    console.error("Gemini API key not set in settings or environment.");
    onChunk("Error: Gemini API key is not configured. Please add it in settings.");
    return;
  }
  if (selectedApiProvider === ApiProvider.OPENAI && !openAiApiKey) {
    console.error("OpenAI API key not set.");
    onChunk("Error: OpenAI API key is not configured in settings.");
    return;
  }

  if (selectedApiProvider === ApiProvider.GEMINI) {
    // As per guidelines, create a new GoogleGenAI instance right before making an API call
    // to ensure it always uses the most up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey! });
    const model = 'gemini-2.5-flash'; // As per guidelines, default for basic text tasks
    
    const history = chatHistory.map(messageToContent);
    const newContent = messageToContent(newMessage);

    const contents = [...history, newContent];

    try {
      const response = await ai.models.generateContentStream({
          model: model,
          contents: contents as any, // Type assertion due to complexity of history/parts
          config: {
              systemInstruction,
              thinkingConfig: { thinkingBudget: 8192 } // Enable thinking process
          }
      });

      for await (const chunk of response) {
        if(chunk.text) {
          onChunk(chunk.text);
        }
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      onChunk("Sorry, I encountered an error with the Gemini API. Please try again or check settings.");
    }
  } else if (selectedApiProvider === ApiProvider.OPENAI) {
    const openaiEndpoint = `${openAiBaseUrl || 'https://api.openai.com/v1'}/chat/completions`;
    const messages = await messagesToOpenAIChatFormat([...chatHistory, newMessage], systemInstruction);
    const model = openAiModel || 'gpt-4o'; // Use default if not set

    try {
      const response = await fetch(openaiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error.message || 'Unknown error'}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) {
        throw new Error("Failed to get response reader for OpenAI stream.");
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // OpenAI streaming response format: data: {...}\n\ndata: {...}\n\n...
        // Need to handle multiple data chunks and possible incomplete lines
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const json = JSON.parse(data);
              const content = json.choices[0].delta.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              console.warn("Could not parse OpenAI stream chunk:", e, data);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      onChunk(`Sorry, I encountered an error with the OpenAI API: ${(error as Error).message}. Please try again or check settings.`);
    }
  }
};