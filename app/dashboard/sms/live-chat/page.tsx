import { PageHeader } from "@/components/dashboard/page-header";
import { SmsChatLayout } from "@/components/sms/sms-chat-layout";

export default function SmsLiveChatPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="SMS Live Chat" description="Review inbound SMS and send manual replies." />
      <SmsChatLayout />
    </div>
  );
}
