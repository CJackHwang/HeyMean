import { getConversations, getNotes } from '../services/db';
import { setPayload } from '../utils/preloadPayload';
import { preloadConversationSnapshot } from '../hooks/useConversation';

export const preloadRouteData = async (
  path: string,
  state: { conversationId?: string } | undefined
): Promise<void> => {
  try {
    if (path === '/chat' && state?.conversationId) {
      await preloadConversationSnapshot(state.conversationId);
      setPayload('chat:conversationId', state.conversationId);
    } else if (path === '/history') {
      const convs = await getConversations();
      setPayload('history:list', convs);
    } else if (path === '/settings' || path === '/about') {
      const notes = await getNotes();
      setPayload('notes:list', notes);
    }
  } catch (error) {
    console.warn('Failed to preload route data:', error);
  }
};
