import { getConversations, getNotes } from '@shared/services/db';
import { setPayload } from '@shared/lib/preloadPayload';
import { preloadConversationSnapshot } from '@features/chat/model/useConversation';

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
