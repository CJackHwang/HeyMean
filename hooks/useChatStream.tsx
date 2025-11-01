
import { useState, useCallback } from 'react';
import { Message, MessageSender } from '../types';
import { streamChatResponse } from '../services/apiService';
import { useSettings } from './useSettings';
import { parseStreamedText } from '../utils/textHelpers';

export const useChatStream = () => {
    const [isThinking, setIsThinking] = useState(false);
    const [streamedAiMessage, setStreamedAiMessage] = useState<Message | null>(null);
    const { effectiveSystemPrompt, selectedApiProvider, geminiApiKey, geminiModel, openAiApiKey, openAiModel, openAiBaseUrl } = useSettings();

    const streamResponse = useCallback((
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

        return streamChatResponse(
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
        ).then((finalStreamedText) => {
            setIsThinking(false);
            const { thinkingContent, finalContent } = parseStreamedText(finalStreamedText);
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
