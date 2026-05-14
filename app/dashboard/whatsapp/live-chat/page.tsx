"use client";

import { WhatsAppChatLayout } from "@/components/whatsapp/whatsapp-chat-layout";
import { useProjectContext } from "@/lib/projects/project-context";

export default function WhatsAppChatsPage() {
  const { activeProject } = useProjectContext();

  return (
    <WhatsAppChatLayout
      projectId={activeProject?.id ?? null}
      title="Chats"
      pollIntervalMs={15000}
      showWebhookHelp
    />
  );
}
