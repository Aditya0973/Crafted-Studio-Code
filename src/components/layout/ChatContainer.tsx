import React, { useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useChatStore } from '../../stores/chatStore';
import { ConversationHeader } from '../chat/ConversationHeader';
import { MessageList } from '../chat/MessageList';
import { Composer } from '../chat/Composer';

export const ChatContainer: React.FC = () => {
  const { activeProject } = useProjectStore();
  const { loadConversationForProject } = useChatStore();

  useEffect(() => {
    if (activeProject && !activeProject.isMissing) {
      loadConversationForProject(activeProject.id);
    } else {
      loadConversationForProject(null);
    }
  }, [activeProject, loadConversationForProject]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-crafted-bg">
      <ConversationHeader />
      <MessageList />
      <Composer />
    </div>
  );
};
