
import { useState, useCallback } from 'react';
import { Message, MessageSender } from '../types';
import { streamChatResponse } from '../services/apiService';
import { useSettings } from './useSettings';

const SUPPORTED_THINKING_TAGS = ['thinking', 'thought', 'scratchpad', 'tool_code', 'function_calls', 'tool_calls'];
const thinkingStartTagRegex = new RegExp(`<(${SUPPORTED_THINKING_TAGS.join('|')})>`, 's');

const parseStreamedText = (text: string) => {
    if (!thinkingStartTagRegex.test(text)) {
        return { thinkingContent: '', finalContent: text, isThinkingBlockComplete: false };
    }
    const startMatch = text.match(thinkingStartTagRegex);
    const tagName = startMatch ? startMatch[1] : null;
    if (!tagName) return { thinkingContent: '', finalContent: text, isThinkingBlockComplete: false };
    const thinkingEndTagRegex = new RegExp(`</${tagName}>`, 's');
    const isThinkingBlockComplete = thinkingEndTagRegex.test(text);
    let thinkingContent = '';
    let finalContent = '';
    if (isThinkingBlockComplete) {
        const fullBlockRegex = new RegExp(`<${tagName}>((?:.|\n)*?)</${tagName}>`, 's');
        const match = text.match(fullBlockRegex);
        if (match) {
            thinkingContent = match[1] || '';
            finalContent = text.substring(match[0].length);
        } else {
            thinkingContent = text;
        }
    } else if (startMatch) {
        thinkingContent = text.substring(startMatch.index! + startMatch[0].length);
    }
    return { thinkingContent, finalContent, isThinkingBlockComplete };
};

export const useChatStream = () => {
    const [isThinking, setIsThinking] = useState(false);
    const [streamedAiMessage, setStreamedAiMessage] = useState<Message | null>(null);
    const { effectiveSystemPrompt, selectedApiProvider, geminiApiKey, geminiModel, openAiApiKey, openAiModel, openAiBaseUrl } = useSettings();

    const streamResponse = useCallback(async (
        chatHistory: Message[],
        userMessage: Message,
        aiMessageId: string
    ) => {
        setIsThinking(true);
        const thinkingStartTime = Date.now();
        setStreamedAiMessage({
            id: aiMessageId,
            conversationId: userMessage.conversationId,
            sender: MessageSender.AI,
            text: '',
            thinkingText: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isLoading: true,
            isThinkingComplete: false,
            thinkingStartTime: thinkingStartTime,
        });

        let streamedText = '';

        streamChatResponse(
            chatHistory,
            userMessage,
            effectiveSystemPrompt,
            selectedApiProvider,
            geminiApiKey,
            geminiModel,
            openAiApiKey,
            openAiModel,
            openAiBaseUrl,
            (chunk) => {
                streamedText += chunk;
                const { thinkingContent, finalContent, isThinkingBlockComplete } = parseStreamedText(streamedText);

                setStreamedAiMessage(prev => {
                    if (!prev) return null;
                    let thinkingDurationUpdate: number | undefined = undefined;
                    if (isThinkingBlockComplete && !prev.thinkingDuration) {
                        thinkingDurationUpdate = (Date.now() - thinkingStartTime) / 1000;
                    }
                    return {
                        ...prev,
                        text: finalContent.trim(),
                        thinkingText: thinkingContent.trim(),
                        isThinkingComplete: isThinkingBlockComplete,
                        thinkingDuration: thinkingDurationUpdate ?? prev.thinkingDuration,
                    };
                });
            }
        ).finally(async () => {
            setIsThinking(false);
            const { thinkingContent, finalContent } = parseStreamedText(streamedText);
            setStreamedAiMessage(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    text: finalContent.trim(),
                    thinkingText: thinkingContent.trim(),
                    isLoading: false,
                    isThinkingComplete: true,
                    thinkingDuration: prev.thinkingDuration || (Date.now() - thinkingStartTime) / 1000,
                };
            });
        });
    }, [
        effectiveSystemPrompt,
        selectedApiProvider,
        geminiApiKey,
        geminiModel,
        openAiApiKey,
        openAiModel,
        openAiBaseUrl
    ]);

    return {
        isThinking,
        streamedAiMessage,
        streamResponse,
    };
};
