"use client";

import { WhatsAppChatLayout } from "@/components/whatsapp/whatsapp-chat-layout";
import { useProjectContext } from "@/lib/projects/project-context";

export default function WhatsAppChatsPage() {
  const { activeProject } = useProjectContext();

  return (
    <WhatsAppChatLayout
      projectId={activeProject?.id ?? null}
      title="Chats"
      description="View and reply to WhatsApp conversations. All messages are saved and shown here."
      pollIntervalMs={15000}
      showWebhookHelp
    />
  );
}
