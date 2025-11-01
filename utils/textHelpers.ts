
import { SUPPORTED_THINKING_TAGS } from './constants';

const thinkingStartTagRegex = new RegExp(`<(${SUPPORTED_THINKING_TAGS.join('|')})>`, 's');

export const parseStreamedText = (text: string) => {
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
