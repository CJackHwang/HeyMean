import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Message, MessageSender, Attachment } from '../types';
import { streamChatResponse } from '../services/apiService'; // Changed import
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';
import { getMessages, addMessage, initDB, clearMessages } from '../services/db';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import { NotesView } from '../components/NotesView';

const b64toBlob = (b64Data: string, contentType='', sliceSize=512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, {type: contentType});
}

const SUPPORTED_THINKING_TAGS = ['thinking', 'thought', 'scratchpad', 'tool_code', 'function_calls', 'tool_calls'];
const thinkingStartTagRegex = new RegExp(`<(${SUPPORTED_THINKING_TAGS.join('|')})>`, 's');

const parseStreamedText = (text: string) => {
    // If the text does not contain a supported thinking tag, it's all final content.
    if (!thinkingStartTagRegex.test(text)) {
        return { 
            thinkingContent: '', 
            finalContent: text, 
            isThinkingBlockComplete: false // No block to be complete.
        };
    }

    const startMatch = text.match(thinkingStartTagRegex);
    const tagName = startMatch ? startMatch[1] : null;

    if (!tagName) {
        // Fallback if regex test passes but match fails (shouldn't happen)
        return { thinkingContent: '', finalContent: text, isThinkingBlockComplete: false };
    }

    const thinkingEndTagRegex = new RegExp(`</${tagName}>`, 's');
    const isThinkingBlockComplete = thinkingEndTagRegex.test(text);

    let thinkingContent = '';
    let finalContent = '';

    if (isThinkingBlockComplete) {
        // Use a regex to find the first complete thinking block.
        const fullBlockRegex = new RegExp(`<${tagName}>((?:.|\n)*?)</${tagName}>`, 's');
        const match = text.match(fullBlockRegex);
        if (match) {
            thinkingContent = match[1] || '';
            // Everything after the first complete block is the final content.
            finalContent = text.substring(match[0].length);
        } else {
            // This case handles malformed tags (e.g. <thinking></thought>)
            // We treat the whole text as thinking content since we detected start/end tags
            // but couldn't parse them as a valid block.
            thinkingContent = text;
            finalContent = '';
        }
    } else {
        // An opening tag exists, but no closing tag yet.
        // Everything after the first opening tag is thinking content.
        if (startMatch) {
           thinkingContent = text.substring(startMatch.index! + startMatch[0].length);
           finalContent = '';
        }
    }

    return { thinkingContent, finalContent, isThinkingBlockComplete };
};


const ChatPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { 
      effectiveSystemPrompt,
      selectedApiProvider, 
      geminiApiKey,
      openAiApiKey, 
      openAiModel, 
      openAiBaseUrl 
    } = useSettings();
    const { t } = useTranslation();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isInitialLoad = useRef(true);

    const handleSend = useCallback(async (text: string, attachment: Attachment | null) => {
        if (!text.trim() && !attachment) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            sender: MessageSender.USER,
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            attachment: attachment || undefined,
            isLoading: false,
        };
        
        // Capture the history BEFORE adding the new user message
        const chatHistory = [...messages];

        setMessages(prev => [...prev, userMessage]);
        await addMessage(userMessage);
        
        setIsThinking(true);
        const aiMessageId = (Date.now() + 1).toString();
        const thinkingStartTime = Date.now();

        setMessages(prev => [...prev, {
            id: aiMessageId,
            sender: MessageSender.AI,
            text: '',
            thinkingText: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isLoading: true,
            isThinkingComplete: false,
            thinkingStartTime: thinkingStartTime,
        }]);

        let streamedText = '';

        streamChatResponse(
            chatHistory, 
            userMessage, 
            effectiveSystemPrompt, 
            selectedApiProvider, 
            geminiApiKey,
            openAiApiKey, 
            openAiModel, 
            openAiBaseUrl, 
            (chunk) => {
                streamedText += chunk;
                
                const { thinkingContent, finalContent, isThinkingBlockComplete } = parseStreamedText(streamedText);
                
                setMessages(prev => {
                    const currentMsg = prev.find(m => m.id === aiMessageId);
                    let thinkingDurationUpdate: number | undefined = undefined;
                    if (isThinkingBlockComplete && currentMsg && !currentMsg.thinkingDuration) {
                        thinkingDurationUpdate = (Date.now() - thinkingStartTime) / 1000;
                    }

                    return prev.map(m => m.id === aiMessageId ? {
                        ...m, 
                        text: finalContent.trim(), 
                        thinkingText: thinkingContent.trim(),
                        isThinkingComplete: isThinkingBlockComplete,
                        thinkingDuration: thinkingDurationUpdate !== undefined ? thinkingDurationUpdate : m.thinkingDuration,
                    } : m);
                });

        }).finally(async () => {
             setIsThinking(false);
             const { thinkingContent, finalContent } = parseStreamedText(streamedText);
             
             const finalAiMessage = { 
                 id: aiMessageId, 
                 sender: MessageSender.AI, 
                 text: finalContent.trim(),
                 thinkingText: thinkingContent.trim(), 
                 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                 isLoading: false,
                 isThinkingComplete: true,
                 thinkingDuration: (Date.now() - thinkingStartTime) / 1000,
             };
             setMessages(prev => prev.map(m => m.id === aiMessageId ? finalAiMessage : m));
             await addMessage(finalAiMessage);
        });
    }, [
      effectiveSystemPrompt,
      messages, 
      selectedApiProvider, 
      geminiApiKey,
      openAiApiKey, 
      openAiModel, 
      openAiBaseUrl
    ]);
    
    useEffect(() => {
      const loadAndInitialize = async () => {
        if (!isInitialLoad.current) return;
        isInitialLoad.current = false;
        
        await initDB(); 
        const { initialPrompt, initialAttachment, newChat } = location.state || {};
        
        if (newChat) {
            await clearMessages();
            setMessages([]); // Clear state as well
        } else {
            // It's not a new chat, so load existing messages
            const history = await getMessages();
            const historyWithPreviews = history.map(m => {
                if (m.attachment && m.attachment.data) {
                    try {
                        const blob = b64toBlob(m.attachment.data.split(',')[1], m.attachment.type);
                        const previewUrl = URL.createObjectURL(blob);
                        return { ...m, attachment: { ...m.attachment, preview: previewUrl } };
                    } catch(e) {
                        console.error("Error creating blob from base64 data", e);
                        return m;
                    }
                }
                return m;
            });
            setMessages(historyWithPreviews);
        }
        
        // If there's an initial prompt, send it. This happens for new chats.
        if (initialPrompt || initialAttachment) {
            handleSend(initialPrompt || '', initialAttachment || null);
            // Clear the location state to prevent re-sending on refresh
            navigate(location.pathname, { replace: true, state: {} });
        }
      };
      loadAndInitialize();
    }, [location.state, navigate, handleSend]);


    useEffect(() => {
        chatContainerRef.current?.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }, [messages]);
    
    return (
        <div className="relative flex h-screen min-h-screen w-full group/design-root overflow-hidden bg-background-light dark:bg-background-dark">
            <div className="flex-1 flex flex-col relative">
                <header className="flex items-center p-4 pb-3 justify-between border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <button onClick={() => navigate('/')} className="flex size-10 shrink-0 items-center justify-center">
                        <span className="material-symbols-outlined !text-2xl text-primary-text-light dark:text-primary-text-dark">arrow_back</span>
                    </button>
                    <h2 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('chat.header_title')}</h2>
                    <div className="flex w-10 items-center justify-end">
                        <button onClick={() => navigate('/settings')} className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-transparent text-primary-text-light dark:text-primary-text-dark gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0">
                            <span className="material-symbols-outlined !text-2xl">more_vert</span>
                        </button>
                    </div>
                </header>

                <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
                    {messages.map((msg) => (
                        <MessageBubble key={`${msg.id}-${msg.isLoading}-${!!msg.isThinkingComplete}`} message={msg} />
                    ))}
                </main>
                
                <input className="hidden" id="notes-drawer" type="checkbox"/>
                
                <div>
                    <label className="xl:hidden flex items-center justify-between p-3 gap-2.5 bg-heymean-l dark:bg-heymean-d border-t border-b border-gray-200 dark:border-gray-700 cursor-pointer" htmlFor="notes-drawer" id="notes-tab">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined !text-xl text-primary-text-light dark:text-primary-text-dark">description</span>
                            <span className="text-sm font-medium text-primary-text-light dark:text-primary-text-dark">{t('chat.notes_tab')}</span>
                        </div>
                        <span className="material-symbols-outlined !text-xl text-primary-text-light dark:text-primary-text-dark transform rotate-180">expand_less</span>
                    </label>

                    <footer className="p-3 bg-background-light dark:bg-background-dark border-t border-gray-200 dark:border-gray-700">
                        <ChatInput onSend={handleSend} isThinking={isThinking} />
                    </footer>
                </div>

                <div className="xl:hidden fixed inset-0 bg-background-light dark:bg-background-dark flex flex-col transition-transform transform translate-y-full opacity-0 pointer-events-none z-10" id="notes-content">
                    <NotesView />
                </div>
            </div>
            <div className="hidden xl:flex flex-col w-2/5 max-w-md border-l border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark">
                <NotesView isDesktop={true} />
            </div>
        </div>
    );
};

export default ChatPage;