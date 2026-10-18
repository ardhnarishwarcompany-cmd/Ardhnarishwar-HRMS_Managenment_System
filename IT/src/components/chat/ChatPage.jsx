import { useState } from "react";
import ChatList from "./ChatList";
import InternalChatWindow from "./InternalChatWindow";
import ITShell from "../../pages/it/ITShell";
import { MessageCircle } from "lucide-react";

const MY_TYPE = "it";

export default function ChatPage() {
  const [activeChat, setActiveChat] = useState(null);

  return (
    <ITShell
      title="Team Chat"
      subtitle="Chat with HR and IT teammates"
      icon={MessageCircle}
    >
      <div className="it-card p-0 h-[calc(100vh-220px)] flex overflow-hidden">
        <ChatList setActiveChat={setActiveChat} activeChat={activeChat} />
        {activeChat?.internal ? (
          <InternalChatWindow activeChat={activeChat} myType={MY_TYPE} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--soft)] text-[var(--mute)]">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/40 dark:to-pink-950/40 rounded-full flex items-center justify-center mb-4">
              <MessageCircle size={40} className="text-[var(--p)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--ink)] mb-1">
              Select a chat
            </h3>
            <p className="text-sm text-[var(--mute)]">
              Choose an HR team member to start chatting
            </p>
          </div>
        )}
      </div>
    </ITShell>
  );
}
