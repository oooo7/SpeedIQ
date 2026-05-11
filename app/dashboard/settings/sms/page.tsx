"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link2, Loader2, Plus, Search, Star } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useProjectContext } from "@/lib/projects/project-context";

type OnboardingState = "not_started" | "pending" | "connected" | "error";

type SmsNumber = {
  id: string;
  phone_number_e164: string;
  twilio_phone_number_sid: string;
  capabilities: { sms?: boolean; mms?: boolean; voice?: boolean };
  status: string;
  is_default: boolean;
};

type AvailableNumber = {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  country: string;
  capabilities: { sms: boolean; mms: boolean; voice: boolean };
};

type WorkingHoursDay = { enabled: boolean; from: string; to: string };

const DAYS: Array<keyof WorkingHoursMap> = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

type WorkingHoursMap = {
  monday: WorkingHoursDay;
  tuesday: WorkingHoursDay;
  wednesday: WorkingHoursDay;
  thursday: WorkingHoursDay;
  friday: WorkingHoursDay;
  saturday: WorkingHoursDay;
  sunday: WorkingHoursDay;
};

const DEFAULT_HOURS: WorkingHoursMap = {
  monday: { enabled: true, from: "09:00", to: "18:00" },
  tuesday: { enabled: true, from: "09:00", to: "18:00" },
  wednesday: { enabled: true, from: "09:00", to: "18:00" },
  thursday: { enabled: true, from: "09:00", to: "18:00" },
  friday: { enabled: true, from: "09:00", to: "18:00" },
  saturday: { enabled: false, from: "09:00", to: "13:00" },
  sunday: { enabled: false, from: "09:00", to: "13:00" },
};

function parseKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((k) => String(k));
  return [];
}

function mergeWorkingHours(raw: unknown): WorkingHoursMap {
  const base: WorkingHoursMap = JSON.parse(JSON.stringify(DEFAULT_HOURS));
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, Partial<WorkingHoursDay>>;
  for (const day of DAYS) {
    const incoming = obj[day];
    if (incoming && typeof incoming === "object") {
      base[day] = {
        enabled: typeof incoming.enabled === "boolean" ? incoming.enabled : base[day].enabled,
        from: typeof incoming.from === "string" ? incoming.from : base[day].from,
        to: typeof incoming.to === "string" ? incoming.to : base[day].to,
      };
    }
  }
  return base;
}

export default function SmsSettingsPage() {
  const { activeProject } = useProjectContext();
  const projectId = activeProject?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [accountSid, setAccountSid] = useState("");
  const [messagingServiceSid, setMessagingServiceSid] = useState("");
  const [defaultFrom, setDefaultFrom] = useState("");
  const [onboardingState, setOnboardingState] = useState<OnboardingState>("not_started");

  const [numbers, setNumbers] = useState<SmsNumber[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [country, setCountry] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [available, setAvailable] = useState<AvailableNumber[]>([]);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);

  const [attachOpen, setAttachOpen] = useState(false);
  const [attachSid, setAttachSid] = useState("");
  const [attaching, setAttaching] = useState(false);

  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");
  const [offHoursEnabled, setOffHoursEnabled] = useState(false);
  const [offHoursText, setOffHoursText] = useState("");

  const [optOutEnabled, setOptOutEnabled] = useState(true);
  const [optOutText, setOptOutText] = useState("");
  const [optOutKeywords, setOptOutKeywords] = useState("STOP, UNSUBSCRIBE, CANCEL, END, QUIT");
  const [optInEnabled, setOptInEnabled] = useState(true);
  const [optInText, setOptInText] = useState("");
  const [optInKeywords, setOptInKeywords] = useState("START, UNSTOP");
  const [helpEnabled, setHelpEnabled] = useState(true);
  const [helpText, setHelpText] = useState("");
  const [helpKeywords, setHelpKeywords] = useState("HELP");
  const [respectOptOut, setRespectOptOut] = useState(true);
  const [advancedOptOut, setAdvancedOptOut] = useState(true);

  const [timezone, setTimezone] = useState("UTC");
  const [workingHours, setWorkingHours] = useState<WorkingHoursMap>(DEFAULT_HOURS);

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [accountRes, settingsRes, numbersRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/sms/account`),
        fetch(`/api/projects/${projectId}/sms/settings`),
        fetch(`/api/projects/${projectId}/sms/numbers`),
      ]);
      const [accountData, settingsData, numbersData] = await Promise.all([
        accountRes.json(),
        settingsRes.json(),
        numbersRes.json(),
      ]);

      if (accountRes.ok && accountData.account) {
        setAccountSid(accountData.account.twilio_account_sid || "");
        setMessagingServiceSid(accountData.account.messaging_service_sid || "");
        setDefaultFrom(accountData.account.default_from || "");
        setOnboardingState((accountData.account.onboarding_state as OnboardingState) || "not_started");
      }

      if (settingsRes.ok && settingsData.settings) {
        const s = settingsData.settings;
        setWelcomeEnabled(!!s.welcome_message_enabled);
        setWelcomeText(s.welcome_message_text || "");
        setOffHoursEnabled(!!s.off_hours_message_enabled);
        setOffHoursText(s.off_hours_message_text || "");
        setOptOutEnabled(s.opt_out_response_enabled !== false);
        setOptOutText(s.opt_out_response_text || "");
        setOptOutKeywords(parseKeywords(s.opt_out_keywords).join(", "));
        setOptInEnabled(s.opt_in_response_enabled !== false);
        setOptInText(s.opt_in_response_text || "");
        setOptInKeywords(parseKeywords(s.opt_in_keywords).join(", "));
        setHelpEnabled(s.help_response_enabled !== false);
        setHelpText(s.help_response_text || "");
        setHelpKeywords(parseKeywords(s.help_keywords).join(", "));
        setRespectOptOut(s.respect_opt_out_for_campaigns !== false);
        setAdvancedOptOut(s.advanced_opt_out_enabled !== false);
        setTimezone(s.timezone || "UTC");
        setWorkingHours(mergeWorkingHours(s.working_hours));
      }

      if (numbersRes.ok) {
        setNumbers(numbersData.numbers ?? []);
      }
    } catch {
      toast.error("Failed to load SMS settings");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function connectTwilio() {
    if (!projectId) return;
    if (!accountSid.trim() || !messagingServiceSid.trim()) {
      toast.error("Add Twilio Account SID and Messaging Service SID first.");
      return;
    }
    setSavingAccount(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sms/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twilio_account_sid: accountSid,
          messaging_service_sid: messagingServiceSid,
          default_from: defaultFrom,
          onboarding_state: "connected",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect Twilio");
      setOnboardingState("connected");
      toast.success("Twilio connected.");
    } catch (err) {
      setOnboardingState("error");
      toast.error(err instanceof Error ? err.message : "Failed to connect Twilio");
    } finally {
      setSavingAccount(false);
    }
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sms/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          welcome_message_enabled: welcomeEnabled,
          welcome_message_text: welcomeText,
          off_hours_message_enabled: offHoursEnabled,
          off_hours_message_text: offHoursText,
          opt_out_response_enabled: optOutEnabled,
          opt_out_response_text: optOutText,
          opt_out_keywords: optOutKeywords.split(",").map((s) => s.trim()).filter(Boolean),
          opt_in_response_enabled: optInEnabled,
          opt_in_response_text: optInText,
          opt_in_keywords: optInKeywords.split(",").map((s) => s.trim()).filter(Boolean),
          help_response_enabled: helpEnabled,
          help_response_text: helpText,
          help_keywords: helpKeywords.split(",").map((s) => s.trim()).filter(Boolean),
          respect_opt_out_for_campaigns: respectOptOut,
          advanced_opt_out_enabled: advancedOptOut,
          timezone,
          working_hours: workingHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  async function searchNumbers() {
    if (!projectId) return;
    setSearching(true);
    setAvailable([]);
    try {
      const qs = new URLSearchParams({ action: "search", country });
      if (areaCode.trim()) qs.set("areaCode", areaCode.trim());
      const res = await fetch(`/api/projects/${projectId}/sms/numbers?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to search numbers");
      setAvailable(data.numbers ?? []);
      if (!(data.numbers ?? []).length) toast.info("No matching numbers available.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to search numbers");
    } finally {
      setSearching(false);
    }
  }

  async function buyNumber(phone: string) {
    if (!projectId) return;
    setBuyingNumber(phone);
    try {
      const res = await fetch(`/api/projects/${projectId}/sms/numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy", phone_number: phone, is_default: numbers.length === 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to buy number");
      toast.success(`Number ${phone} added.`);
      setSearchOpen(false);
      setAvailable([]);
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to buy number");
    } finally {
      setBuyingNumber(null);
    }
  }

  async function attachExisting(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !attachSid.trim()) return;
    setAttaching(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sms/numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "attach", twilio_phone_number_sid: attachSid.trim(), is_default: numbers.length === 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to attach number");
      toast.success("Number attached.");
      setAttachOpen(false);
      setAttachSid("");
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to attach number");
    } finally {
      setAttaching(false);
    }
  }

  const isConnected = onboardingState === "connected";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="SMS Settings" description="Configure Twilio integration, numbers, and automation defaults." />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Twilio Connection</CardTitle>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Connected" : onboardingState === "error" ? "Connection Error" : "Not Connected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Account SID</Label>
                  <Input value={accountSid} onChange={(e) => setAccountSid(e.target.value)} placeholder="AC..." />
                </div>
                <div>
                  <Label>Messaging Service SID</Label>
                  <Input value={messagingServiceSid} onChange={(e) => setMessagingServiceSid(e.target.value)} placeholder="MG..." />
                </div>
                <div className="md:col-span-2">
                  <Label>Default sender (optional)</Label>
                  <Input value={defaultFrom} onChange={(e) => setDefaultFrom(e.target.value)} placeholder="+14155552344" />
                </div>
              </div>
              <Button type="button" onClick={connectTwilio} disabled={savingAccount}>
                <Link2 className="mr-2 h-4 w-4" />
                {savingAccount ? "Saving..." : isConnected ? "Update Twilio Connection" : "Connect Twilio"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Phone Numbers</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAttachOpen(true)}>
                    Attach existing
                  </Button>
                  <Button size="sm" onClick={() => setSearchOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Buy number
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {numbers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No numbers attached yet. Buy one or attach an existing Twilio number.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="p-2 text-left font-medium">Number</th>
                      <th className="p-2 text-left font-medium">SID</th>
                      <th className="p-2 text-left font-medium">Capabilities</th>
                      <th className="p-2 text-left font-medium">Status</th>
                      <th className="p-2 text-left font-medium">Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {numbers.map((n) => (
                      <tr key={n.id} className="border-b last:border-0">
                        <td className="p-2 font-medium">{n.phone_number_e164}</td>
                        <td className="p-2 text-muted-foreground text-xs">{n.twilio_phone_number_sid}</td>
                        <td className="p-2 text-xs">
                          {n.capabilities?.sms ? "SMS " : ""}
                          {n.capabilities?.mms ? "MMS " : ""}
                          {n.capabilities?.voice ? "Voice" : ""}
                        </td>
                        <td className="p-2">{n.status}</td>
                        <td className="p-2">{n.is_default ? <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" /> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <form onSubmit={saveSettings} className="flex flex-col gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Respect opt-outs in campaigns</Label>
                    <p className="text-xs text-muted-foreground">Skip contacts marked as unsubscribed when sending campaigns.</p>
                  </div>
                  <Switch checked={respectOptOut} onCheckedChange={setRespectOptOut} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Use Twilio Advanced Opt-Out</Label>
                    <p className="text-xs text-muted-foreground">Twilio handles STOP/START/HELP and reports OptOutType in webhooks.</p>
                  </div>
                  <Switch checked={advancedOptOut} onCheckedChange={setAdvancedOptOut} />
                </div>

                <KeywordsBlock
                  title="Opt-out (STOP)"
                  enabled={optOutEnabled}
                  onEnabled={setOptOutEnabled}
                  text={optOutText}
                  onText={setOptOutText}
                  keywords={optOutKeywords}
                  onKeywords={setOptOutKeywords}
                />
                <KeywordsBlock
                  title="Opt-in (START)"
                  enabled={optInEnabled}
                  onEnabled={setOptInEnabled}
                  text={optInText}
                  onText={setOptInText}
                  keywords={optInKeywords}
                  onKeywords={setOptInKeywords}
                />
                <KeywordsBlock
                  title="Help (HELP)"
                  enabled={helpEnabled}
                  onEnabled={setHelpEnabled}
                  text={helpText}
                  onText={setHelpText}
                  keywords={helpKeywords}
                  onKeywords={setHelpKeywords}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Auto-replies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Welcome reply on first inbound</Label>
                    <p className="text-xs text-muted-foreground">Sent the first time a contact texts you (within working hours).</p>
                  </div>
                  <Switch checked={welcomeEnabled} onCheckedChange={setWelcomeEnabled} />
                </div>
                <Input value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} placeholder="Welcome message text" disabled={!welcomeEnabled} />

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label className="text-sm">Off-hours reply</Label>
                    <p className="text-xs text-muted-foreground">Sent when first inbound arrives outside working hours.</p>
                  </div>
                  <Switch checked={offHoursEnabled} onCheckedChange={setOffHoursEnabled} />
                </div>
                <Input value={offHoursText} onChange={(e) => setOffHoursText(e.target.value)} placeholder="Off-hours message text" disabled={!offHoursEnabled} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Working hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm">Timezone</Label>
                  <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC" />
                  <p className="mt-1 text-xs text-muted-foreground">Use IANA format (e.g. America/New_York, Asia/Kolkata).</p>
                </div>
                <div className="grid gap-2">
                  {DAYS.map((day) => {
                    const value = workingHours[day];
                    return (
                      <div key={day} className="flex flex-wrap items-center gap-3 border p-2">
                        <div className="flex w-32 items-center gap-2">
                          <Switch
                            checked={value.enabled}
                            onCheckedChange={(checked) =>
                              setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], enabled: checked } }))
                            }
                          />
                          <span className="text-sm capitalize">{day}</span>
                        </div>
                        <Input
                          type="time"
                          value={value.from}
                          disabled={!value.enabled}
                          className="w-32"
                          onChange={(e) =>
                            setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], from: e.target.value } }))
                          }
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={value.to}
                          disabled={!value.enabled}
                          className="w-32"
                          onChange={(e) =>
                            setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], to: e.target.value } }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingSettings}>
                {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {savingSettings ? "Saving..." : "Save settings"}
              </Button>
            </div>
          </form>
        </>
      )}

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Buy a Twilio number</DialogTitle>
            <DialogDescription>Search Twilio inventory and provision a new SMS-capable number.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="Country (US)" className="w-24" />
            <Input value={areaCode} onChange={(e) => setAreaCode(e.target.value)} placeholder="Area code (optional)" />
            <Button type="button" onClick={searchNumbers} disabled={searching}>
              <Search className="mr-2 h-4 w-4" />
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>
          <div className="max-h-72 overflow-auto border">
            {available.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No results yet. Search to see available numbers.</div>
            ) : (
              available.map((num) => (
                <div key={num.phoneNumber} className="flex items-center justify-between border-b p-3 text-sm last:border-0">
                  <div>
                    <div className="font-medium">{num.friendlyName}</div>
                    <div className="text-xs text-muted-foreground">
                      {num.locality || num.region || num.country}
                      {" • "}
                      {num.capabilities.sms ? "SMS " : ""}
                      {num.capabilities.mms ? "MMS " : ""}
                      {num.capabilities.voice ? "Voice" : ""}
                    </div>
                  </div>
                  <Button size="sm" disabled={buyingNumber === num.phoneNumber} onClick={() => buyNumber(num.phoneNumber)}>
                    {buyingNumber === num.phoneNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach existing Twilio number</DialogTitle>
            <DialogDescription>Paste the IncomingPhoneNumber SID (PN...) from your Twilio console.</DialogDescription>
          </DialogHeader>
          <form onSubmit={attachExisting} className="space-y-3">
            <Input value={attachSid} onChange={(e) => setAttachSid(e.target.value)} placeholder="PN..." required />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAttachOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={attaching}>
                {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Attach"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KeywordsBlock(props: {
  title: string;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  text: string;
  onText: (v: string) => void;
  keywords: string;
  onKeywords: (v: string) => void;
}) {
  return (
    <div className="space-y-2 border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{props.title}</Label>
        <Switch checked={props.enabled} onCheckedChange={props.onEnabled} />
      </div>
      <Input
        value={props.keywords}
        onChange={(e) => props.onKeywords(e.target.value)}
        placeholder="Comma-separated keywords"
      />
      <Input
        value={props.text}
        onChange={(e) => props.onText(e.target.value)}
        placeholder="Auto-reply text"
        disabled={!props.enabled}
      />
    </div>
  );
}
