"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectContext } from "@/lib/projects/project-context";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: "marketing", label: "Marketing", icon: Megaphone, description: "Send with media and customised buttons to engage your customers." },
  { value: "utility", label: "Utility", icon: Settings2, description: "Send messages about an existing order or account." },
  { value: "authentication", label: "Authentication", icon: ShieldCheck, description: "Send codes to verify a transaction or login." },
] as const;
type Category = (typeof CATEGORIES)[number]["value"];

const HEADER_FORMATS = [
  { value: "none", label: "None" },
  { value: "text", label: "Text" },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "video", label: "Video", icon: Film },
  { value: "document", label: "Document", icon: FileText },
  { value: "location", label: "Location", icon: MapPin },
] as const;
type HeaderFormat = (typeof HEADER_FORMATS)[number]["value"];

const BUTTON_TYPES = [
  { value: "quick_reply", label: "Quick reply", group: "reply" },
  { value: "url", label: "Visit website", group: "cta" },
  { value: "phone_number", label: "Call phone number", group: "cta" },
  { value: "copy_code", label: "Copy offer code", group: "cta" },
] as const;
type ButtonType = (typeof BUTTON_TYPES)[number]["value"];

interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phone_number?: string;
  offer_code?: string;
}

const WHATSAPP_LANGUAGES = [
  { code: "af", label: "Afrikaans" }, { code: "sq", label: "Albanian" }, { code: "ar", label: "Arabic" },
  { code: "az", label: "Azerbaijani" }, { code: "bn", label: "Bengali" }, { code: "bg", label: "Bulgarian" },
  { code: "ca", label: "Catalan" }, { code: "zh_CN", label: "Chinese (Simplified)" },
  { code: "zh_HK", label: "Chinese (Hong Kong)" }, { code: "zh_TW", label: "Chinese (Traditional)" },
  { code: "hr", label: "Croatian" }, { code: "cs", label: "Czech" }, { code: "da", label: "Danish" },
  { code: "nl", label: "Dutch" }, { code: "en", label: "English" }, { code: "en_GB", label: "English (UK)" },
  { code: "en_US", label: "English (US)" }, { code: "et", label: "Estonian" }, { code: "fil", label: "Filipino" },
  { code: "fi", label: "Finnish" }, { code: "fr", label: "French" }, { code: "ka", label: "Georgian" },
  { code: "de", label: "German" }, { code: "el", label: "Greek" }, { code: "gu", label: "Gujarati" },
  { code: "ha", label: "Hausa" }, { code: "he", label: "Hebrew" }, { code: "hi", label: "Hindi" },
  { code: "hu", label: "Hungarian" }, { code: "id", label: "Indonesian" }, { code: "ga", label: "Irish" },
  { code: "it", label: "Italian" }, { code: "ja", label: "Japanese" }, { code: "kn", label: "Kannada" },
  { code: "kk", label: "Kazakh" }, { code: "rw_RW", label: "Kinyarwanda" }, { code: "ko", label: "Korean" },
  { code: "ky_KG", label: "Kyrgyz" }, { code: "lo", label: "Lao" }, { code: "lv", label: "Latvian" },
  { code: "lt", label: "Lithuanian" }, { code: "mk", label: "Macedonian" }, { code: "ms", label: "Malay" },
  { code: "ml", label: "Malayalam" }, { code: "mr", label: "Marathi" }, { code: "nb", label: "Norwegian" },
  { code: "fa", label: "Persian" }, { code: "pl", label: "Polish" }, { code: "pt_BR", label: "Portuguese (Brazil)" },
  { code: "pt_PT", label: "Portuguese (Portugal)" }, { code: "pa", label: "Punjabi" },
  { code: "ro", label: "Romanian" }, { code: "ru", label: "Russian" }, { code: "sr", label: "Serbian" },
  { code: "sk", label: "Slovak" }, { code: "sl", label: "Slovenian" }, { code: "es", label: "Spanish" },
  { code: "es_AR", label: "Spanish (Argentina)" }, { code: "es_ES", label: "Spanish (Spain)" },
  { code: "es_MX", label: "Spanish (Mexico)" }, { code: "sw", label: "Swahili" }, { code: "sv", label: "Swedish" },
  { code: "ta", label: "Tamil" }, { code: "te", label: "Telugu" }, { code: "th", label: "Thai" },
  { code: "tr", label: "Turkish" }, { code: "uk", label: "Ukrainian" }, { code: "ur", label: "Urdu" },
  { code: "uz", label: "Uzbek" }, { code: "vi", label: "Vietnamese" }, { code: "zu", label: "Zulu" },
];

const FIELD_CHIPS = [
  { key: "first_name", label: "First name", example: "Alex" },
  { key: "last_name", label: "Last name", example: "Smith" },
  { key: "name", label: "Full name", example: "Alex Smith" },
  { key: "email", label: "Email", example: "alex@example.com" },
  { key: "phone", label: "Phone", example: "15551234567" },
] as const;

// ---------------------------------------------------------------------------
// Variable helpers — body uses friendly names like {{first_name}}, converted
// to numbered {{1}}, {{2}} on save for Meta.
// ---------------------------------------------------------------------------

function getNamedVariables(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\{\{([a-z][a-z0-9_]*)\}\}/gi);
  if (!matches) return [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const m of matches) {
    const name = m.replace(/\{\{|\}\}/g, "").toLowerCase();
    if (!seen.has(name)) { seen.add(name); ordered.push(name); }
  }
  return ordered;
}

function friendlyBodyToNumbered(text: string, varNames: string[]): string {
  let result = text;
  varNames.forEach((name, i) => {
    result = result.replace(new RegExp(`\\{\\{${name}\\}\\}`, "gi"), `{{${i + 1}}}`);
  });
  return result;
}

function previewBody(text: string, varExamples: Record<string, string>): string {
  let result = text;
  for (const [key, val] of Object.entries(varExamples)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "gi"), val || `{{${key}}}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
const STEPS = [
  { id: "setup", label: "Set up template" },
  { id: "edit", label: "Edit template" },
] as const;
type StepId = (typeof STEPS)[number]["id"];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewWhatsAppTemplatePage() {
  const { activeProject } = useProjectContext();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<StepId>("setup");
  const [category, setCategory] = useState<Category>("utility");

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [langOpen, setLangOpen] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const langRef = useRef<HTMLDivElement>(null);

  const [headerFormat, setHeaderFormat] = useState<HeaderFormat>("none");
  const [headerText, setHeaderText] = useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [headerMediaUploading, setHeaderMediaUploading] = useState(false);
  const [headerFileName, setHeaderFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<TemplateButton[]>([]);
  const [btnDropdownOpen, setBtnDropdownOpen] = useState(false);
  const btnDropdownRef = useRef<HTMLDivElement>(null);

  const [varExamples, setVarExamples] = useState<Record<string, string>>({});
  const [customFieldKeys, setCustomFieldKeys] = useState<string[]>([]);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langOpen && langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (btnDropdownOpen && btnDropdownRef.current && !btnDropdownRef.current.contains(e.target as Node)) setBtnDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen, btnDropdownOpen]);

  // Fetch custom field keys
  useEffect(() => {
    if (!activeProject?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/contacts?limit=200`);
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const contacts = Array.isArray(data?.contacts) ? data.contacts : [];
        const keys = new Set<string>();
        for (const c of contacts as Array<{ custom_fields?: Record<string, unknown> }>) {
          if (c?.custom_fields && typeof c.custom_fields === "object") {
            for (const k of Object.keys(c.custom_fields)) {
              const t = k.trim();
              if (t) keys.add(t);
            }
          }
        }
        if (!cancelled) setCustomFieldKeys(Array.from(keys).sort());
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [activeProject?.id]);

  // Insert variable at cursor
  const insertVariable = useCallback((fieldKey: string) => {
    const token = `{{${fieldKey}}}`;
    const textarea = bodyRef.current;
    if (!textarea) { setBody((prev) => prev + token); return; }
    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    const chip = FIELD_CHIPS.find((c) => c.key === fieldKey);
    if (chip && !varExamples[fieldKey]) {
      setVarExamples((prev) => ({ ...prev, [fieldKey]: chip.example }));
    }
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + token.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }, [body, varExamples]);

  // Buttons
  const addButton = (type: ButtonType) => {
    if (buttons.length >= 10) { toast.error("Maximum 10 buttons"); return; }
    setButtons((prev) => [...prev, {
      type, text: "",
      url: type === "url" ? "https://" : undefined,
      phone_number: type === "phone_number" ? "" : undefined,
      offer_code: type === "copy_code" ? "" : undefined,
    }]);
    setBtnDropdownOpen(false);
  };
  const updateButton = (i: number, u: Partial<TemplateButton>) => setButtons((prev) => prev.map((b, idx) => idx === i ? { ...b, ...u } : b));
  const removeButton = (i: number) => setButtons((prev) => prev.filter((_, idx) => idx !== i));

  // File upload for media header
  const handleHeaderUpload = async (file: File) => {
    if (!activeProject?.id) return;
    setHeaderMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/settings/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const publicUrl = `${window.location.origin}/api/storage/${data.path}`;
      setHeaderMediaUrl(data.path);
      setHeaderFileName(file.name);
      toast.success("File uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setHeaderMediaUploading(false);
    }
  };

  // Build payload
  const buildPayload = () => {
    const varNames = getNamedVariables(body);
    const numberedBody = friendlyBodyToNumbered(body, varNames);
    const variables = varNames.map((n) => (varExamples[n] ?? "").trim().slice(0, 100));
    const variable_field_mapping = varNames.map((n) => {
      if (FIELD_CHIPS.some((c) => c.key === n)) return n;
      if (customFieldKeys.includes(n)) return `custom:${n}`;
      return "";
    });

    return {
      name: name.trim(),
      category,
      language,
      body: numberedBody.trim(),
      header: headerFormat === "text" ? (headerText.trim() || null) : null,
      header_format: headerFormat === "none" ? "text" : headerFormat,
      header_media_url: !["none", "text"].includes(headerFormat) ? (headerMediaUrl.trim() || null) : null,
      footer: footer.trim() || null,
      buttons: buttons.map((b) => ({
        type: b.type === "copy_code" ? "quick_reply" : b.type,
        text: b.text.trim(),
        ...(b.url ? { url: b.url.trim() } : {}),
        ...(b.phone_number ? { phone_number: b.phone_number.trim() } : {}),
      })),
      variables,
      variable_field_mapping,
    };
  };

  const handleSaveDraft = async () => {
    if (!activeProject?.id || !name.trim()) { toast.error("Template name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/templates`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success("Template saved as draft");
      router.push("/dashboard/whatsapp/templates");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
    finally { setSaving(false); }
  };

  const handleSubmitForReview = async () => {
    if (!activeProject?.id) return;
    if (!name.trim()) { toast.error("Template name is required"); return; }
    if (!body.trim()) { toast.error("Body text is required"); return; }
    setSaving(true);
    try {
      const createRes = await fetch(`/api/projects/${activeProject.id}/whatsapp/templates`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error ?? "Failed to create");
      const templateId = createData.template?.id;
      if (!templateId) throw new Error("No template ID returned");
      setSubmitting(true);
      const submitRes = await fetch(`/api/projects/${activeProject.id}/whatsapp/templates/${templateId}/submit`, { method: "POST" });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error ?? "Submit failed");
      toast.success("Template submitted for approval");
      router.push("/dashboard/whatsapp/templates");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not submit"); }
    finally { setSaving(false); setSubmitting(false); }
  };

  if (!activeProject) return <div className="p-6 text-sm text-muted-foreground">Select a project first.</div>;

  const selectedLang = WHATSAPP_LANGUAGES.find((l) => l.code === language) ?? WHATSAPP_LANGUAGES[14];
  const filteredLangs = langSearch ? WHATSAPP_LANGUAGES.filter((l) => l.label.toLowerCase().includes(langSearch.toLowerCase()) || l.code.toLowerCase().includes(langSearch.toLowerCase())) : WHATSAPP_LANGUAGES;
  const namedVars = getNamedVariables(body);
  const previewText = previewBody(body, varExamples);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/whatsapp/templates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="h-4 w-4" /> Templates
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {STEPS.map((step, i) => {
          const isActive = step.id === currentStep;
          const isPast = i < STEPS.findIndex((s) => s.id === currentStep);
          return (
            <div key={step.id} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground/40 select-none">·</span>}
              <button type="button" onClick={() => isPast && setCurrentStep(step.id)} disabled={!isPast && !isActive}
                className={`flex items-center gap-1.5 ${isActive ? "text-foreground font-medium" : isPast ? "text-muted-foreground hover:text-foreground cursor-pointer" : "text-muted-foreground/50 cursor-default"}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${isActive ? "bg-foreground text-background" : isPast ? "bg-muted text-muted-foreground" : "bg-muted/50 text-muted-foreground/50"}`}>
                  {isPast ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ---- STEP 1: Setup ---- */}
      {currentStep === "setup" && (
        <div className="flex flex-col gap-6 max-w-3xl">
          <div>
            <h2 className="text-lg font-semibold">Set up your template</h2>
            <p className="text-sm text-muted-foreground">Choose the category that best describes your message template.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const selected = category === cat.value;
              return (
                <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-start gap-2 rounded border p-4 text-left transition-colors ${selected ? "border-foreground bg-foreground/5" : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"}`}>
                  <div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span className="font-medium text-sm">{cat.label}</span></div>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setCurrentStep("edit")} className="gap-1">Continue <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* ---- STEP 2: Edit with live preview ---- */}
      {currentStep === "edit" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

          {/* Left: Editor */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold">Edit template</h2>
              <p className="text-sm text-muted-foreground">Add a header, body and footer. Meta will review the content.</p>
            </div>

            {/* Name + Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tpl-name">Template name *</Label>
                <Input id="tpl-name" value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))}
                  placeholder="e.g. order_confirmation" maxLength={512} />
                <p className="text-xs text-muted-foreground">{name.length}/512</p>
              </div>
              <div className="space-y-2">
                <Label>Language *</Label>
                <div className="relative" ref={langRef}>
                  <button type="button" onClick={() => setLangOpen(!langOpen)}
                    className="flex h-9 w-full items-center justify-between border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-1 text-sm">
                    <span>{selectedLang.label}</span><ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {langOpen && (
                    <div className="absolute z-50 mt-1 w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 max-h-60 overflow-hidden flex flex-col">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-800">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input value={langSearch} onChange={(e) => setLangSearch(e.target.value)} placeholder="Search..." className="w-full bg-transparent pl-7 pr-2 py-1 text-sm outline-none" autoFocus />
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {filteredLangs.map((l) => (
                          <button key={l.code} type="button" onClick={() => { setLanguage(l.code); setLangOpen(false); setLangSearch(""); }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${language === l.code ? "bg-gray-50 dark:bg-gray-800/50 font-medium" : ""}`}>
                            <span className={`h-2 w-2 rounded-full ${language === l.code ? "bg-foreground" : ""}`} />{l.label}
                          </button>
                        ))}
                        {filteredLangs.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No match</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="space-y-3 border border-gray-200 dark:border-gray-800 rounded p-4">
              <Label>Header (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {HEADER_FORMATS.map((fmt) => {
                  const sel = headerFormat === fmt.value;
                  return (
                    <button key={fmt.value} type="button" onClick={() => { setHeaderFormat(fmt.value); if (fmt.value === "none") { setHeaderText(""); setHeaderMediaUrl(""); setHeaderFileName(""); } }}
                      className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs transition-colors ${sel ? "border-foreground bg-foreground/5 font-medium" : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"}`}>
                      {"icon" in fmt && fmt.icon ? <fmt.icon className="h-3.5 w-3.5" /> : null}{fmt.label}
                    </button>
                  );
                })}
              </div>
              {headerFormat === "text" && (
                <div className="space-y-1">
                  <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Add a short line of text to the header" maxLength={60} />
                  <p className="text-xs text-muted-foreground text-right">{headerText.length}/60</p>
                </div>
              )}
              {!["none", "text"].includes(headerFormat) && (
                <div className="space-y-2">
                  <input ref={fileInputRef} type="file" className="hidden"
                    accept={headerFormat === "image" ? "image/jpeg,image/png" : headerFormat === "video" ? "video/mp4,video/3gpp" : headerFormat === "document" ? ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" : ""}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeaderUpload(f); e.target.value = ""; }} />
                  {!headerFileName ? (
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={headerMediaUploading}
                      className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded p-6 text-sm text-muted-foreground hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
                      {headerMediaUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                      <span>{headerMediaUploading ? "Uploading..." : "Drag and drop to upload"}</span>
                      <span className="text-xs">Or <span className="underline">choose files on your device</span></span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-800 rounded p-3">
                      {headerFormat === "image" && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                      {headerFormat === "video" && <Film className="h-4 w-4 text-muted-foreground" />}
                      {headerFormat === "document" && <FileText className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm flex-1 truncate">{headerFileName}</span>
                      <button type="button" onClick={() => { setHeaderMediaUrl(""); setHeaderFileName(""); }} className="text-muted-foreground hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {headerFormat === "image" && "JPEG or PNG, max 5 MB"}
                    {headerFormat === "video" && "MP4 or 3GPP, max 16 MB"}
                    {headerFormat === "document" && "PDF, DOC, XLS, PPT etc., max 100 MB"}
                  </p>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="space-y-3 border border-gray-200 dark:border-gray-800 rounded p-4">
              <Label htmlFor="tpl-body">Body *</Label>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground self-center">Insert field:</span>
                {FIELD_CHIPS.map((chip) => (
                  <button key={chip.key} type="button" onClick={() => insertVariable(chip.key)}
                    className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800">
                    {chip.label}
                  </button>
                ))}
                {customFieldKeys.map((key) => (
                  <button key={key} type="button" onClick={() => insertVariable(key)}
                    className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-800">
                    {key}
                  </button>
                ))}
              </div>
              <textarea id="tpl-body" ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)}
                placeholder={`e.g. Hello {{first_name}}, your order has been confirmed.`}
                rows={5} maxLength={1024}
                className="flex w-full border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 text-sm min-h-[120px] resize-y" />
              <p className="text-xs text-muted-foreground text-right">{body.length}/1024</p>

              {namedVars.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Variable samples (required for Meta approval)</p>
                  <div className="flex flex-col gap-2">
                    {namedVars.map((varName) => (
                      <div key={varName} className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs shrink-0 font-mono">{`{{${varName}}}`}</Badge>
                        <Input value={varExamples[varName] ?? ""} onChange={(e) => setVarExamples((prev) => ({ ...prev, [varName]: e.target.value }))}
                          placeholder={`Sample for ${varName}`} className="flex-1 h-8 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-800 rounded p-4">
              <Label htmlFor="tpl-footer">Footer (optional)</Label>
              <Input id="tpl-footer" value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Add a short line of text to the footer" maxLength={60} />
              <p className="text-xs text-muted-foreground text-right">{footer.length}/60</p>
            </div>

            {/* Buttons */}
            <div className="space-y-3 border border-gray-200 dark:border-gray-800 rounded p-4">
              <Label>Buttons (optional)</Label>
              <p className="text-xs text-muted-foreground">Create buttons that let customers respond or take action. Up to 10 buttons; more than 3 appear in a list.</p>

              {buttons.length > 0 && (
                <div className="flex flex-col gap-3">
                  {buttons.map((btn, i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-800 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium capitalize">
                            {btn.type === "quick_reply" ? "Quick reply" : btn.type === "url" ? "Visit website" : btn.type === "phone_number" ? "Call phone number" : "Copy offer code"}
                          </span>
                        </div>
                        <button type="button" onClick={() => removeButton(i)} className="text-muted-foreground hover:text-red-500"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Button text</span>
                          <Input value={btn.text} onChange={(e) => updateButton(i, { text: e.target.value })} placeholder="Button text" maxLength={25} className="h-8 text-sm" />
                          <p className="text-xs text-muted-foreground text-right">{(btn.text || "").length}/25</p>
                        </div>
                        {btn.type === "url" && (
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Website URL</span>
                            <Input value={btn.url ?? ""} onChange={(e) => updateButton(i, { url: e.target.value })} placeholder="https://example.com" className="h-8 text-sm" />
                          </div>
                        )}
                        {btn.type === "phone_number" && (
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Phone number</span>
                            <Input value={btn.phone_number ?? ""} onChange={(e) => updateButton(i, { phone_number: e.target.value })} placeholder="+15551234567" className="h-8 text-sm" />
                          </div>
                        )}
                        {btn.type === "copy_code" && (
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Offer code sample</span>
                            <Input value={btn.offer_code ?? ""} onChange={(e) => updateButton(i, { offer_code: e.target.value })} placeholder="SAVE20" maxLength={20} className="h-8 text-sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {buttons.length < 10 && (
                <div className="relative" ref={btnDropdownRef}>
                  <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setBtnDropdownOpen(!btnDropdownOpen)}>
                    <Plus className="h-3.5 w-3.5" /> Add button <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                  {btnDropdownOpen && (
                    <div className="absolute z-40 mt-1 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded w-52">
                      {BUTTON_TYPES.map((bt) => (
                        <button key={bt.value} type="button" onClick={() => addButton(bt.value)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-left">
                          {bt.value === "quick_reply" && <MessageSquare className="h-3.5 w-3.5" />}
                          {bt.value === "url" && <ExternalLink className="h-3.5 w-3.5" />}
                          {bt.value === "phone_number" && <Phone className="h-3.5 w-3.5" />}
                          {bt.value === "copy_code" && <Copy className="h-3.5 w-3.5" />}
                          {bt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button variant="outline" onClick={() => setCurrentStep("setup")} className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="gap-1 flex-1 sm:flex-none">
                  {saving && !submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save as draft
                </Button>
                <Button onClick={handleSubmitForReview} disabled={saving} className="gap-1 flex-1 sm:flex-none">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit for review
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Live preview */}
          <div className="hidden lg:block sticky top-6">
            <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" /> Template preview</p>
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-[#e5ddd5] dark:bg-gray-800/50">
              {/* Phone top bar */}
              <div className="bg-[#075e54] dark:bg-gray-900 text-white px-4 py-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">B</div>
                <div>
                  <p className="text-sm font-medium">Business</p>
                  <p className="text-[10px] opacity-70">online</p>
                </div>
              </div>

              {/* Chat area */}
              <div className="p-3 min-h-[320px] flex flex-col justify-end">
                <div className="max-w-[280px]">
                  <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
                    {/* Media header preview */}
                    {headerFormat === "image" && (
                      <div className="bg-gray-200 dark:bg-gray-700 h-32 flex items-center justify-center">
                        {headerMediaUrl ? (
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        ) : (
                          <div className="text-center text-xs text-muted-foreground"><ImageIcon className="h-6 w-6 mx-auto mb-1" /><span>Image</span></div>
                        )}
                      </div>
                    )}
                    {headerFormat === "video" && (
                      <div className="bg-gray-200 dark:bg-gray-700 h-32 flex items-center justify-center">
                        <div className="text-center text-xs text-muted-foreground"><Film className="h-6 w-6 mx-auto mb-1" /><span>Video</span></div>
                      </div>
                    )}
                    {headerFormat === "document" && (
                      <div className="bg-gray-100 dark:bg-gray-800 px-3 py-3 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-red-500" />
                        <span className="text-xs truncate">{headerFileName || "Document"}</span>
                      </div>
                    )}
                    {headerFormat === "location" && (
                      <div className="bg-gray-200 dark:bg-gray-700 h-24 flex items-center justify-center">
                        <div className="text-center text-xs text-muted-foreground"><MapPin className="h-6 w-6 mx-auto mb-1" /><span>Location</span></div>
                      </div>
                    )}

                    <div className="p-2.5 space-y-1">
                      {headerFormat === "text" && headerText && (
                        <p className="font-semibold text-sm">{headerText}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{previewText || <span className="text-muted-foreground italic">Body text will appear here</span>}</p>
                      {footer && <p className="text-xs text-muted-foreground mt-1">{footer}</p>}
                      <p className="text-[10px] text-muted-foreground text-right">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>

                    {buttons.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700">
                        {buttons.slice(0, 3).map((btn, i) => (
                          <div key={i} className="text-center text-xs text-[#00a5f4] py-2 border-b last:border-b-0 border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1">
                            {btn.type === "url" && <ExternalLink className="h-3 w-3" />}
                            {btn.type === "phone_number" && <Phone className="h-3 w-3" />}
                            {btn.type === "copy_code" && <Copy className="h-3 w-3" />}
                            {btn.text || "Button"}
                          </div>
                        ))}
                        {buttons.length > 3 && (
                          <div className="text-center text-[10px] text-muted-foreground py-1">+ {buttons.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
