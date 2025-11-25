
import { SUPPORTED_THINKING_TAGS } from './constants';

const thinkingStartTagRegex = new RegExp(`<(${SUPPORTED_THINKING_TAGS.join('|')})>`, 's');

export const parseStreamedText = (text: string) => {
    const startMatch = text.match(thinkingStartTagRegex);
    
    if (!startMatch) {
        return { thinkingContent: '', finalContent: text, isThinkingBlockComplete: false };
    }

    const tagName = startMatch[1];
    const startIndex = startMatch.index!;
    const openTagLength = startMatch[0].length;
    
    const endTagRegex = new RegExp(`</${tagName}>`, 's');
    const endMatch = text.match(endTagRegex);

    // Check for tool_code as an implicit closer
    const toolCodeRegex = /<tool_code>/;
    const toolMatch = text.match(toolCodeRegex);

    let endIndex = -1;
    let isComplete = false;
    let closeTagLength = 0;

    if (endMatch) {
        endIndex = endMatch.index!;
        closeTagLength = endMatch[0].length;
        isComplete = true;
    } else if (toolMatch && toolMatch.index! > startIndex) {
        // Implicit close if tool code appears after start tag and (no end tag or tool code is before end tag)
        // Note: toolMatch.index could be after endMatch.index, which is fine (normal case). 
        // We only care if tool code appears *inside* the unclosed block.
        endIndex = toolMatch.index!;
        closeTagLength = 0; // No tag to skip
        isComplete = true;
    }

    let thinkingContent = '';
    let finalContent = '';
    const prefix = text.substring(0, startIndex);

    if (isComplete) {
        thinkingContent = text.substring(startIndex + openTagLength, endIndex);
        const suffix = text.substring(endIndex + closeTagLength);
        finalContent = prefix + suffix;
    } else {
        thinkingContent = text.substring(startIndex + openTagLength);
        finalContent = prefix;
    }

    return { thinkingContent, finalContent, isThinkingBlockComplete: isComplete };
};
