
import { useState, useCallback, useRef } from 'react';
import { Message, MessageSender } from '@shared/types';
import { StreamController } from '@shared/services/streamController';
import { useSettings } from '@app/providers/useSettings';
import { parseStreamedText } from '@shared/lib/textHelpers';

export const useChatStream = () => {
    const [isThinking, setIsThinking] = useState(false);
    const [streamedAiMessage, setStreamedAiMessage] = useState<Message | null>(null);
    const { effectiveSystemPrompt, selectedApiProvider, geminiApiKey, geminiModel, openAiApiKey, openAiModel, openAiBaseUrl } = useSettings();
    const controllerRef = useRef<StreamController | null>(null);
    if (!controllerRef.current) controllerRef.current = new StreamController();

    const streamResponse = useCallback((
        chatHistory: Message[],
        userMessage: Message,
        aiMessageId: string
    ) => {
        // Cancel any ongoing stream to avoid re-entrancy
        controllerRef.current?.cancel();
        setIsThinking(true);
        const thinkingStartTime = Date.now();
        setStreamedAiMessage({
            id: aiMessageId,
            conversationId: userMessage.conversationId,
            sender: MessageSender.AI,
            text: '',
            thinkingText: '',
            timestamp: new Date(),
            isLoading: true,
            isThinkingComplete: false,
            thinkingStartTime: thinkingStartTime,
        });

        let streamedText = '';

        return controllerRef.current!.start(
            chatHistory,
            userMessage,
            aiMessageId,
            {
                provider: selectedApiProvider,
                systemInstruction: effectiveSystemPrompt,
                geminiApiKey,
                geminiModel,
                openAiApiKey,
                openAiModel,
                openAiBaseUrl,
            },
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
        }).catch(() => {
            // Swallow cancellation to avoid user-visible error text injection
            setIsThinking(false);
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
        cancel: () => controllerRef.current?.cancel(),
    };
};
