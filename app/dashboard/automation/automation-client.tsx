"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Mail,
  Smartphone,
  Clock,
  GitFork,
  Play,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Save,
  BookOpen,
  ArrowRight,
  Settings,
  Activity,
  CheckCircle2,
  X,
  Zap,
  RotateCcw,
  LayoutGrid,
  ChevronRight,
  TrendingUp,
  Percent,
  Cpu
} from "lucide-react";
import { toast } from "sonner";

// Node definition
interface FlowNode {
  id: string;
  type: "trigger" | "action" | "delay" | "condition";
  channel?: "whatsapp" | "email" | "sms";
  title: string;
  config: {
    templateId?: string;
    templateName?: string;
    subject?: string;
    body?: string;
    delayDuration?: number;
    delayUnit?: "minutes" | "hours" | "days";
    conditionKey?: "opened" | "clicked" | "replied";
  };
  stats?: {
    entered: number;
    completed: number;
    converted?: number;
  };
  yesBranch?: FlowNode[];
  noBranch?: FlowNode[];
}

// Preset Journey Blueprints
const PRESETS: Record<string, { name: string; description: string; triggerTitle: string; root: FlowNode[] }> = {
  cartRecovery: {
    name: "Abandoned Cart Recovery",
    description: "Re-engage shoppers who left items in their cart using a high-conversion WhatsApp nudge followed by email/SMS backups.",
    triggerTitle: "Trigger: Shopify Abandoned Cart Webhook",
    root: [
      {
        id: "delay-1",
        type: "delay",
        title: "Wait 30 Minutes",
        config: { delayDuration: 30, delayUnit: "minutes" },
        stats: { entered: 1420, completed: 1420 }
      },
      {
        id: "action-wa",
        type: "action",
        channel: "whatsapp",
        title: "Send WhatsApp Recovery Nudge",
        config: { templateName: "cart_recovery_coupon", templateId: "tpl-wa-101" },
        stats: { entered: 1420, completed: 1395 }
      },
      {
        id: "cond-1",
        type: "condition",
        title: "Did customer checkout?",
        config: { conditionKey: "clicked" },
        stats: { entered: 1395, completed: 1395 },
        yesBranch: [
          {
            id: "action-yes-crm",
            type: "action",
            channel: "whatsapp",
            title: "Update Tag: Active Purchaser",
            config: { body: "Update custom tag to purchased inside customer context." },
            stats: { entered: 652, completed: 652 }
          }
        ],
        noBranch: [
          {
            id: "delay-no",
            type: "delay",
            title: "Wait 1 Day",
            config: { delayDuration: 1, delayUnit: "days" },
            stats: { entered: 743, completed: 743 }
          },
          {
            id: "action-no-email",
            type: "action",
            channel: "email",
            title: "Email Backup Offer",
            config: { subject: "Still interested? Free shipping inside!", templateName: "recovery_followup" },
            stats: { entered: 743, completed: 743 }
          }
        ]
      }
    ]
  },
  onboarding: {
    name: "User Onboarding Drip",
    description: "Guide new signups through checklist activation with Email drips and support WhatsApp followups.",
    triggerTitle: "Trigger: Clerk Sign-up Event",
    root: [
      {
        id: "action-email-welcome",
        type: "action",
        channel: "email",
        title: "Email: Welcome & Checklist",
        config: { subject: "Welcome to SpeedIQ!", templateName: "welcome_checklist" },
        stats: { entered: 850, completed: 850 }
      },
      {
        id: "delay-onboarding",
        type: "delay",
        title: "Wait 2 Days",
        config: { delayDuration: 2, delayUnit: "days" },
        stats: { entered: 850, completed: 820 }
      },
      {
        id: "cond-onboarding",
        type: "condition",
        title: "Has completed setup?",
        config: { conditionKey: "opened" },
        stats: { entered: 820, completed: 820 },
        yesBranch: [
          {
            id: "action-setup-yes",
            type: "action",
            channel: "email",
            title: "Email: Pro Tips & Best Practices",
            config: { subject: "Advanced workflow hacks", templateName: "pro_tips" },
            stats: { entered: 510, completed: 510 }
          }
        ],
        noBranch: [
          {
            id: "action-setup-no",
            type: "action",
            channel: "whatsapp",
            title: "WhatsApp: Direct Setup Help",
            config: { templateName: "personal_onboarding_support" },
            stats: { entered: 310, completed: 305 }
          }
        ]
      }
    ]
  },
  feedbackLoop: {
    name: "Customer Feedback Loop",
    description: "Gather product surveys after shipping events, routing complaints automatically to live support chat.",
    triggerTitle: "Trigger: Shopify Order Delivered",
    root: [
      {
        id: "delay-feedback",
        type: "delay",
        title: "Wait 3 Days",
        config: { delayDuration: 3, delayUnit: "days" },
        stats: { entered: 410, completed: 410 }
      },
      {
        id: "action-feedback-email",
        type: "action",
        channel: "email",
        title: "Email: Support Rating Survey",
        config: { subject: "How did we do? Quick feedback request", templateName: "rating_survey" },
        stats: { entered: 410, completed: 410 }
      }
    ]
  }
};

export function AutomationClient() {
  const [triggerName, setTriggerName] = useState(PRESETS.cartRecovery.triggerTitle);
  const [nodes, setNodes] = useState<FlowNode[]>(PRESETS.cartRecovery.root);
  const [selectedPreset, setSelectedPreset] = useState("cartRecovery");

  // Selection / Configuration Panel State
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Simulation Runner State
  const [simulating, setSimulating] = useState(false);
  const [simLogs, setSimLogs] = useState<{ time: string; type: "info" | "trigger" | "dispatch" | "check" | "complete"; msg: string }[]>([]);
  const [activeSimNodeId, setActiveSimNodeId] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll simulator logs to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [simLogs]);

  // Load cache locally
  useEffect(() => {
    const cached = localStorage.getItem("speediq-saved-journey");
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setNodes(data.nodes);
        setTriggerName(data.triggerName);
      } catch {
        // ignore fallback
      }
    }
  }, []);

  const saveJourney = () => {
    localStorage.setItem("speediq-saved-journey", JSON.stringify({ nodes, triggerName }));
    toast.success("Journey builder workspace saved locally!");
  };

  const publishJourney = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Verifying journey logic and active API templates...",
        success: "Journey published! Webhook triggers are now live.",
        error: "Failed to publish campaign."
      }
    );
  };

  const loadPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setNodes(JSON.parse(JSON.stringify(preset.root))); // Deep clone preset
      setTriggerName(preset.triggerTitle);
      setSelectedPreset(presetKey);
      setSelectedNode(null);
      setIsInspectorOpen(false);
      setSimulating(false);
      setActiveSimNodeId(null);
      setSimLogs([]);
    }
  };

  // Node editing actions
  const updateNodeConfig = (nodeId: string, updatedConfig: Partial<FlowNode["config"]>, newTitle?: string) => {
    const recursiveUpdate = (list: FlowNode[]): FlowNode[] => {
      return list.map((node) => {
        if (node.id === nodeId) {
          const updated = {
            ...node,
            title: newTitle || node.title,
            config: { ...node.config, ...updatedConfig }
          };
          // Sync selectedNode state if currently open
          if (selectedNode?.id === nodeId) {
            setSelectedNode(updated);
          }
          return updated;
        }
        if (node.yesBranch || node.noBranch) {
          return {
            ...node,
            yesBranch: node.yesBranch ? recursiveUpdate(node.yesBranch) : undefined,
            noBranch: node.noBranch ? recursiveUpdate(node.noBranch) : undefined
          };
        }
        return node;
      });
    };

    setNodes(recursiveUpdate(nodes));
  };

  const deleteNode = (nodeId: string) => {
    const recursiveDelete = (list: FlowNode[]): FlowNode[] => {
      return list
        .filter((node) => node.id !== nodeId)
        .map((node) => {
          if (node.yesBranch || node.noBranch) {
            return {
              ...node,
              yesBranch: node.yesBranch ? recursiveDelete(node.yesBranch) : undefined,
              noBranch: node.noBranch ? recursiveDelete(node.noBranch) : undefined
            };
          }
          return node;
        });
    };

    setNodes(recursiveDelete(nodes));
    setSelectedNode(null);
    setIsInspectorOpen(false);
    toast.error("Node deleted from workflow.");
  };

  // Append new node to parent path or nested branch
  const appendNode = (
    type: "action" | "delay" | "condition",
    channel?: "whatsapp" | "email" | "sms",
    parentBranch?: "yes" | "no",
    parentCondNodeId?: string
  ) => {
    const newNode: FlowNode = {
      id: `${type}-${Date.now().toString().slice(-4)}`,
      type,
      channel,
      title: 
        type === "delay" ? "Wait 1 Hour" :
        type === "condition" ? "Branch Condition" :
        `Send ${channel === "whatsapp" ? "WhatsApp" : channel === "email" ? "Email" : "SMS"}`,
      config: 
        type === "delay" ? { delayDuration: 1, delayUnit: "hours" } :
        type === "condition" ? { conditionKey: "opened" } :
        channel === "whatsapp" ? { templateName: "new_campaign_nudge" } :
        channel === "email" ? { subject: "Action Required!", templateName: "welcome_checklist" } :
        { body: "Hello! This is SpeedIQ." },
      stats: { entered: 0, completed: 0 }
    };

    if (type === "condition") {
      newNode.yesBranch = [];
      newNode.noBranch = [];
    }

    if (parentCondNodeId && parentBranch) {
      // Append inside a conditional branch
      const insertNested = (list: FlowNode[]): FlowNode[] => {
        return list.map((node) => {
          if (node.id === parentCondNodeId) {
            if (parentBranch === "yes") {
              return { ...node, yesBranch: [...(node.yesBranch || []), newNode] };
            } else {
              return { ...node, noBranch: [...(node.noBranch || []), newNode] };
            }
          }
          return {
            ...node,
            yesBranch: node.yesBranch ? insertNested(node.yesBranch) : undefined,
            noBranch: node.noBranch ? insertNested(node.noBranch) : undefined
          };
        });
      };
      setNodes(insertNested(nodes));
    } else {
      // Append to the root sequence
      setNodes([...nodes, newNode]);
    }

    toast.success("New node added to flow.");
  };

  // Simulate Campaign Traversal
  const runSimulation = async () => {
    if (nodes.length === 0) {
      toast.error("Please add nodes to simulate.");
      return;
    }

    setSimulating(true);
    setSimLogs([]);
    toast.loading("Starting lead automation simulation...", { id: "sim-toast" });

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const appendLog = (type: "info" | "trigger" | "dispatch" | "check" | "complete", msg: string) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      setSimLogs((prev) => [...prev, { time: timeStr, type, msg }]);
    };

    await sleep(1000);
    toast.dismiss("sim-toast");
    appendLog("info", "🏁 Simulated lead session: active-cart-session-982");
    appendLog("trigger", `ℹ️ Trigger activated: "${triggerName}"`);

    // Recursive traversal runner
    const traverse = async (list: FlowNode[]) => {
      for (const node of list) {
        setActiveSimNodeId(node.id);
        appendLog("info", `📍 Active node: [${node.title}]`);
        
        if (node.type === "delay") {
          const duration = node.config.delayDuration || 1;
          const unit = node.config.delayUnit || "hours";
          appendLog("check", `⏳ Delay node: Waiting for ${duration} ${unit} (simulated delay resetting)...`);
          await sleep(1200);
        } else if (node.type === "action") {
          appendLog("dispatch", `⚡ Routing campaign dispatch...`);
          if (node.channel === "whatsapp") {
            appendLog("dispatch", `🟢 Meta API template "${node.config.templateName || "default"}" sent successfully.`);
          } else if (node.channel === "email") {
            appendLog("dispatch", `🔵 Resend Service dispatched email with subject: "${node.config.subject || "No Subject"}"`);
          } else {
            appendLog("dispatch", `🟡 Twilio SMS gateway: Pushed message confirmation received.`);
          }
          await sleep(1000);
        } else if (node.type === "condition") {
          const condKey = node.config.conditionKey || "opened";
          appendLog("check", `❓ Criteria test: Evaluating if customer "${condKey}"...`);
          
          // Random mock branching decision
          const decision = Math.random() > 0.4;
          await sleep(1000);

          if (decision) {
            appendLog("complete", `🟢 Logic check MET: Traversing [YES (Match)] Branch.`);
            if (node.yesBranch && node.yesBranch.length > 0) {
              await traverse(node.yesBranch);
            }
          } else {
            appendLog("check", `🔴 Logic check NOT MET: Traversing [NO (Miss)] Branch.`);
            if (node.noBranch && node.noBranch.length > 0) {
              await traverse(node.noBranch);
            }
          }
        }
      }
    };

    await traverse(nodes);
    setActiveSimNodeId(null);
    appendLog("complete", `🏆 Lead automation journey completed. Exited successfully.`);
    setSimulating(false);
    toast.success("Simulation finished!");
  };

  return (
    <div 
      className="min-h-screen bg-[#060608] text-gray-100 flex flex-col selection:bg-purple-500/30 selection:text-purple-200"
      style={{
        fontFamily: "var(--font-sans), system-ui, sans-serif"
      }}
    >
      {/* Dynamic Keyframes injecting into DOM */}
      <style>{`
        @keyframes speediq-dash-flow {
          to {
            stroke-dashoffset: -20;
          }
        }
        @keyframes speediq-glow-pulse {
          0%, 100% { border-color: rgba(139, 92, 246, 0.4); box-shadow: 0 0 15px rgba(139, 92, 246, 0.1); }
          50% { border-color: rgba(139, 92, 246, 0.8); box-shadow: 0 0 25px rgba(139, 92, 246, 0.3); }
        }
        .canvas-grid-radial {
          background-image: radial-gradient(circle, rgba(168, 85, 247, 0.12) 1.2px, transparent 1.2px);
          background-size: 24px 24px;
          mask-image: radial-gradient(circle at center, black 40%, rgba(0, 0, 0, 0.5) 70%, transparent 95%);
        }
      `}</style>

      {/* Top Banner Toolbar - Premium Glassmorphic */}
      <div 
        className="sticky top-0 z-40 border-b border-gray-900/60"
        style={{
          background: "rgba(6, 6, 8, 0.8)",
          backdropFilter: "blur(20px)"
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-800/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Cpu size={12} className="animate-spin-slow" /> WORKFLOW STUDIO
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Journey Builder
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 max-w-lg leading-relaxed">
              Design event-driven messaging pipelines and conditional rules across messaging networks.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            <button
              onClick={saveJourney}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gray-950 border border-gray-800 hover:bg-gray-900 text-gray-300 rounded-xl hover:text-white hover:border-gray-700 transition duration-200"
            >
              <Save size={14} />
              Save Workspace
            </button>
            <button
              onClick={publishJourney}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition duration-200"
            >
              <CheckCircle2 size={14} />
              Publish Campaign
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Top Bar - High-Fidelity */}
      <div className="bg-[#0b0b0e] border-b border-gray-900/50 py-3.5 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              <span className="text-[11px] text-gray-500 uppercase tracking-widest font-mono">Status:</span>
              <span className="text-xs font-semibold text-emerald-400">3 Campaigns Active</span>
            </div>
            <div className="h-4 w-px bg-gray-900 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-purple-400" />
              <span className="text-[11px] text-gray-500 uppercase tracking-widest font-mono">Ingested:</span>
              <span className="text-xs font-semibold text-gray-300">14,208 contacts</span>
            </div>
            <div className="h-4 w-px bg-gray-900 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <TrendingUp size={13} className="text-blue-400" />
              <span className="text-[11px] text-gray-500 uppercase tracking-widest font-mono">Conversion:</span>
              <span className="text-xs font-semibold text-gray-300">42.8% recovery</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <BookOpen size={13} className="text-purple-400" />
            <span>Presets:</span>
            <div className="flex gap-1.5 ml-1">
              {Object.entries(PRESETS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => loadPreset(key)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all duration-200 ${
                    selectedPreset === key
                      ? "bg-purple-950/40 border-purple-800 text-purple-300"
                      : "bg-gray-950 border-gray-900 hover:border-gray-800 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {item.name.split(" ")[0]} {/* First word */}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Workspace Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side Panel: Visual Flow Canvas */}
        <div 
          className="flex-1 p-6 relative overflow-y-auto min-h-[500px] flex justify-center"
        >
          <div className="absolute inset-0 canvas-grid-radial pointer-events-none"></div>

          <div className="relative z-10 max-w-xl w-full flex flex-col items-center gap-10 py-6 pb-28">
            
            {/* Trigger Point */}
            <div className="relative flex flex-col items-center">
              <div 
                className="border rounded-2xl px-6 py-3.5 text-center shadow-2xl max-w-[320px] transition duration-300 hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(180deg, rgba(88, 28, 135, 0.15) 0%, rgba(6, 6, 8, 0.4) 100%)",
                  borderColor: "rgba(139, 92, 246, 0.3)",
                  boxShadow: "0 10px 40px -10px rgba(139, 92, 246, 0.15)"
                }}
              >
                <div className="flex items-center gap-1.5 justify-center text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                  Trigger Hook
                </div>
                <input
                  type="text"
                  value={triggerName}
                  onChange={(e) => setTriggerName(e.target.value)}
                  className="bg-transparent border-none font-bold text-sm text-center text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-700/50 rounded w-full p-1"
                />
              </div>
              
              {/* Connector line below trigger */}
              <div className="h-10 w-0.5 bg-gradient-to-b from-purple-500/40 to-gray-800"></div>
            </div>

            {/* Recursively Render Nodes */}
            {nodes.length === 0 ? (
              <div className="text-center p-10 border border-dashed border-gray-800 bg-gray-950/40 rounded-2xl text-gray-500 w-full max-w-[340px]">
                <LayoutGrid size={24} className="mx-auto mb-2.5 text-gray-600" />
                <p className="text-xs">No campaign steps defined yet.</p>
                <p className="text-[10px] text-gray-600 mt-1">Insert a messaging node below.</p>
              </div>
            ) : (
              <RenderNodeList
                list={nodes}
                onSelectNode={(n) => {
                  setSelectedNode(n);
                  setIsInspectorOpen(true);
                }}
                activeSimNodeId={activeSimNodeId}
                appendNode={appendNode}
                deleteNode={deleteNode}
              />
            )}

            {/* Append Root Actions */}
            <div className="flex flex-col items-center pt-2">
              <div className="h-8 w-0.5 bg-gray-800"></div>
              <AddNodeDropdown onAdd={(type, ch) => appendNode(type, ch)} />
            </div>

          </div>
        </div>

        {/* Right Side Panel: Inspector Config & Console Logs */}
        <div 
          className="w-full lg:w-[440px] bg-[#08080a] border-t lg:border-t-0 lg:border-l border-gray-900 flex flex-col overflow-y-auto"
          style={{ height: "calc(100vh - 120px)" }}
        >
          {/* Node Inspector Drawer */}
          {isInspectorOpen && selectedNode ? (
            <div className="p-6 border-b border-gray-900 flex flex-col gap-6 bg-gradient-to-b from-[#0e0e12] to-[#08080a]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Settings size={13} /> Config Inspector
                </span>
                <button
                  onClick={() => setIsInspectorOpen(false)}
                  className="text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-900 transition"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Connected node identifier */}
              <div className="flex items-center gap-3.5 p-4 bg-gray-950/70 border border-gray-850 rounded-2xl shadow-inner">
                <span className={`p-2.5 rounded-xl border flex items-center justify-center ${
                  selectedNode.type === "delay" ? "bg-amber-950/20 border-amber-900/40 text-amber-400" :
                  selectedNode.type === "condition" ? "bg-purple-950/20 border-purple-900/40 text-purple-400" :
                  "bg-blue-950/20 border-blue-900/40 text-blue-400"
                }`}>
                  <NodeIcon type={selectedNode.type} channel={selectedNode.channel} size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedNode.title}</h4>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono font-medium">{selectedNode.type} step</span>
                </div>
              </div>

              {/* Editable Fields based on node types */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Display Title</label>
                  <input
                    type="text"
                    value={selectedNode.title}
                    onChange={(e) => updateNodeConfig(selectedNode.id, {}, e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition duration-200"
                  />
                </div>

                {selectedNode.type === "delay" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Duration</label>
                      <input
                        type="number"
                        min="1"
                        value={selectedNode.config.delayDuration || 1}
                        onChange={(e) => updateNodeConfig(selectedNode.id, { delayDuration: Number(e.target.value) })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Unit</label>
                      <select
                        value={selectedNode.config.delayUnit || "hours"}
                        onChange={(e: any) => updateNodeConfig(selectedNode.id, { delayUnit: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition duration-200"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedNode.type === "action" && selectedNode.channel === "whatsapp" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Meta WhatsApp Template</label>
                    <select
                      value={selectedNode.config.templateName || ""}
                      onChange={(e) => updateNodeConfig(selectedNode.id, { templateName: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition duration-200"
                    >
                      <option value="cart_recovery_coupon">cart_recovery_coupon (10% Off)</option>
                      <option value="welcome_alert">welcome_alert (Registration)</option>
                      <option value="personal_onboarding_support">personal_onboarding_support (Support)</option>
                      <option value="feedback_ask">feedback_ask (Survey)</option>
                    </select>
                  </div>
                )}

                {selectedNode.type === "action" && selectedNode.channel === "email" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject Line</label>
                      <input
                        type="text"
                        value={selectedNode.config.subject || ""}
                        onChange={(e) => updateNodeConfig(selectedNode.id, { subject: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition duration-200"
                        placeholder="Email subject..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Template Layout</label>
                      <select
                        value={selectedNode.config.templateName || "welcome_checklist"}
                        onChange={(e) => updateNodeConfig(selectedNode.id, { templateName: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition duration-200"
                      >
                        <option value="welcome_checklist">Welcome Checklist (Minimalist)</option>
                        <option value="recovery_followup">Promo Offer (Modern Bold)</option>
                        <option value="rating_survey">NPS Feed (Clean Card)</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedNode.type === "action" && selectedNode.channel === "sms" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">SMS Message Body</label>
                    <textarea
                      value={selectedNode.config.body || ""}
                      onChange={(e) => updateNodeConfig(selectedNode.id, { body: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition h-24 resize-none"
                    />
                  </div>
                )}

                {selectedNode.type === "condition" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Check Rule Logic</label>
                    <select
                      value={selectedNode.config.conditionKey || "opened"}
                      onChange={(e: any) => updateNodeConfig(selectedNode.id, { conditionKey: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition duration-200"
                    >
                      <option value="opened">Has opened previous campaign</option>
                      <option value="clicked">Has clicked interactive redirect button</option>
                      <option value="replied">Has sent inbound WhatsApp reply</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-900 flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-mono">Node ID: {selectedNode.id}</span>
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-bold px-3 py-1.5 rounded-xl hover:bg-red-950/20 transition duration-150"
                >
                  <Trash2 size={13} />
                  Delete Step
                </button>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-gray-500 border-b border-gray-900 bg-gray-950/20">
              <Settings size={22} className="mx-auto mb-2 text-gray-600 animate-pulse" />
              <p className="text-xs font-semibold text-gray-400">Inspector Idle</p>
              <p className="text-[11px] mt-1 leading-relaxed text-gray-500">
                Click any step on the canvas to configure messages, durations, or condition checks.
              </p>
            </div>
          )}

          {/* Simulator Console - macOS Styled Terminal */}
          <div className="flex-1 p-6 flex flex-col gap-4 min-h-[340px]">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Activity size={13} className="text-emerald-400 animate-pulse" />
                Live Execution Logs
              </span>
              {simulating && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/30 text-emerald-400 border border-emerald-900/30 text-[9px] font-semibold animate-pulse">
                  ● SIMULATING LEAD
                </span>
              )}
            </div>

            {/* macOS Console Frame */}
            <div className="flex-1 bg-black border border-gray-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
              {/* Terminal Header */}
              <div className="bg-[#121216] px-4 py-3 flex items-center justify-between border-b border-gray-900">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">sh - speediq-simulator</span>
                <div className="w-12"></div>
              </div>

              {/* Terminal Logs Output */}
              {simLogs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-black">
                  <Zap size={24} className="mb-2 text-zinc-700 animate-pulse" />
                  <p className="text-xs font-semibold font-mono text-zinc-500">Console idle.</p>
                  <p className="text-[10px] mt-1 font-mono text-zinc-600 max-w-[200px]">Click ⚡ Simulate Lead to preview campaign sequence actions.</p>
                </div>
              ) : (
                <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed overflow-y-auto flex flex-col gap-2 max-h-[360px] bg-black">
                  {simLogs.map((log, idx) => {
                    const colorClass = 
                      log.type === "trigger" ? "text-purple-400 font-bold" :
                      log.type === "dispatch" ? "text-sky-400" :
                      log.type === "check" ? "text-amber-300" :
                      log.type === "complete" ? "text-emerald-400 font-semibold" :
                      "text-zinc-400";
                    return (
                      <div 
                        key={idx} 
                        className="animate-[speediq-fadeSlide_0.15s_ease-out_forwards]"
                        style={{ wordBreak: "break-all" }}
                      >
                        <span className="text-zinc-600 mr-2">[{log.time}]</span>
                        <span className={colorClass}>{log.msg}</span>
                      </div>
                    );
                  })}
                  <div ref={consoleEndRef} />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Nodes Rendering List Component
interface RenderNodeListProps {
  list: FlowNode[];
  onSelectNode: (node: FlowNode) => void;
  activeSimNodeId: string | null;
  appendNode: (type: "action" | "delay" | "condition", channel?: "whatsapp" | "email" | "sms", parentBranch?: "yes" | "no", parentCondNodeId?: string) => void;
  deleteNode: (nodeId: string) => void;
}

function RenderNodeList({
  list,
  onSelectNode,
  activeSimNodeId,
  appendNode,
  deleteNode
}: RenderNodeListProps) {
  return (
    <div className="flex flex-col items-center w-full gap-10">
      {list.map((node, index) => {
        const isSimActive = activeSimNodeId === node.id;
        
        // Define distinct channel aesthetics
        const theme = 
          node.type === "delay" ? { border: "rgba(245, 158, 11, 0.4)", text: "text-amber-400", badge: "bg-amber-950/30 border-amber-900/40" } :
          node.type === "condition" ? { border: "rgba(236, 72, 153, 0.4)", text: "text-pink-400", badge: "bg-pink-950/30 border-pink-900/40" } :
          node.channel === "whatsapp" ? { border: "rgba(16, 185, 129, 0.4)", text: "text-emerald-400", badge: "bg-emerald-950/30 border-emerald-800/40" } :
          node.channel === "email" ? { border: "rgba(59, 130, 246, 0.4)", text: "text-blue-400", badge: "bg-blue-950/30 border-blue-800/40" } :
          { border: "rgba(245, 158, 11, 0.4)", text: "text-amber-400", badge: "bg-amber-950/30 border-amber-800/40" };

        return (
          <div key={node.id} className="w-full flex flex-col items-center">
            {/* Visual Node Card */}
            <div 
              onClick={() => onSelectNode(node)}
              className={`w-full max-w-[340px] rounded-2xl border p-4.5 bg-[#0f0f13]/70 backdrop-blur-md cursor-pointer hover:-translate-y-0.5 transition-all duration-300 shadow-xl flex flex-col gap-3 relative overflow-hidden group ${
                isSimActive 
                  ? "border-emerald-500 shadow-emerald-950/20 ring-2 ring-emerald-500/20" 
                  : "border-gray-800/80 hover:border-gray-700/80 shadow-black/40"
              }`}
            >
              {/* Top glowing ambient effect on hover */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at top, ${theme.border} 0%, transparent 70%)`
                }}
              ></div>

              {/* Colored left indicator strip */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-[4px]" 
                style={{ backgroundColor: theme.border }}
              ></div>

              <div className="flex items-center justify-between pl-1">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-xl border flex items-center justify-center shadow-md ${theme.badge} ${theme.text}`}>
                    <NodeIcon type={node.type} channel={node.channel} size={16} />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-wide group-hover:text-purple-300 transition">{node.title}</h3>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono font-semibold">
                      {node.type === "delay" ? "Time Delay" :
                       node.type === "condition" ? "Rule Split" :
                       `${node.channel} Send`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/20 transition duration-150 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Node Summary Configuration info */}
              <div className="text-[10px] text-gray-400 bg-gray-950/70 border border-gray-900 rounded-xl p-3 flex flex-col gap-1 font-mono shadow-inner">
                {node.type === "delay" && (
                  <div className="flex items-center gap-1">
                    <span className="text-amber-500">⏱</span>
                    <span>Wait {node.config.delayDuration} {node.config.delayUnit}</span>
                  </div>
                )}
                {node.type === "action" && (
                  <div className="truncate flex items-center gap-1">
                    {node.channel === "whatsapp" && (
                      <>
                        <span className="text-emerald-500">💬</span>
                        <span>template_{node.config.templateName || "nudge"}</span>
                      </>
                    )}
                    {node.channel === "email" && (
                      <>
                        <span className="text-blue-500">📧</span>
                        <span className="truncate">"{node.config.subject || "Welcome Alert"}"</span>
                      </>
                    )}
                    {node.channel === "sms" && (
                      <>
                        <span className="text-amber-500">📟</span>
                        <span>"{node.config.body || "Alert text"}"</span>
                      </>
                    )}
                  </div>
                )}
                {node.type === "condition" && (
                  <div className="flex items-center gap-1">
                    <span className="text-pink-500">❓</span>
                    <span>Check if recipient {node.config.conditionKey || "opened"}</span>
                  </div>
                )}
              </div>

              {/* Stats Bar (Mock analytics progress overlay) */}
              {node.stats && (
                <div className="flex flex-col gap-1.5 border-t border-gray-900 pt-3 mt-1 pl-1">
                  <div className="flex items-center justify-between text-[9px] font-mono text-gray-500">
                    <div>Pushed: <span className="text-gray-300 font-bold">{node.stats.entered}</span></div>
                    <div>Success: <span className="text-gray-300 font-bold">{node.stats.completed}</span></div>
                  </div>
                  {/* Small progress bar */}
                  <div className="w-full h-1 bg-gray-950 rounded-full overflow-hidden border border-gray-900">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                      style={{ width: `${(node.stats.completed / Math.max(1, node.stats.entered)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Render Branches if Conditional Split Node */}
            {node.type === "condition" && (
              <div className="w-full flex flex-col items-center">
                {/* Visual Branch Curves */}
                <div className="w-full max-w-[520px] h-12 relative">
                  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="gradient-yes" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1f2937" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="gradient-no" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1f2937" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                    <path d="M 260,0 C 260,20 120,20 120,48" stroke="url(#gradient-yes)" strokeWidth="2.5" fill="none" />
                    <path d="M 260,0 C 260,20 400,20 400,48" stroke="url(#gradient-no)" strokeWidth="2.5" fill="none" />
                  </svg>
                  <span className="absolute left-[70px] top-[14px] text-[9px] font-bold text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-900/30 font-mono">YES / MATCH</span>
                  <span className="absolute right-[70px] top-[14px] text-[9px] font-bold text-red-400 bg-red-950/20 px-2 py-0.5 rounded-full border border-red-900/30 font-mono">NO / MISS</span>
                </div>

                {/* Left/Right branching sequences */}
                <div className="grid grid-cols-2 gap-8 w-full max-w-[660px] mt-1">
                  {/* Yes Branch Container */}
                  <div className="flex flex-col items-center border-r border-gray-900/30 pr-4">
                    {node.yesBranch && node.yesBranch.length > 0 ? (
                      <RenderNodeList
                        list={node.yesBranch}
                        onSelectNode={onSelectNode}
                        activeSimNodeId={activeSimNodeId}
                        appendNode={appendNode}
                        deleteNode={deleteNode}
                      />
                    ) : (
                      <div className="text-[10px] text-gray-600 py-3 italic font-mono">Exit flow</div>
                    )}
                    <div className="h-4 w-0.5 bg-gray-800/60 mt-3"></div>
                    <AddNodeDropdown 
                      onAdd={(type, ch) => appendNode(type, ch, "yes", node.id)} 
                      small 
                    />
                  </div>

                  {/* No Branch Container */}
                  <div className="flex flex-col items-center pl-4">
                    {node.noBranch && node.noBranch.length > 0 ? (
                      <RenderNodeList
                        list={node.noBranch}
                        onSelectNode={onSelectNode}
                        activeSimNodeId={activeSimNodeId}
                        appendNode={appendNode}
                        deleteNode={deleteNode}
                      />
                    ) : (
                      <div className="text-[10px] text-gray-600 py-3 italic font-mono">Exit flow</div>
                    )}
                    <div className="h-4 w-0.5 bg-gray-800/60 mt-3"></div>
                    <AddNodeDropdown 
                      onAdd={(type, ch) => appendNode(type, ch, "no", node.id)} 
                      small 
                    />
                  </div>
                </div>

                {/* Joining path vectors */}
                <div className="w-full max-w-[520px] h-12 relative mt-3">
                  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 120,0 C 120,28 260,28 260,48" stroke="#1f2937" strokeWidth="2.5" fill="none" />
                    <path d="M 400,0 C 400,28 260,28 260,48" stroke="#1f2937" strokeWidth="2.5" fill="none" />
                  </svg>
                </div>
              </div>
            )}

            {/* Connecting lines in between nodes */}
            {index < list.length - 1 && node.type !== "condition" && (
              <div className="h-10 w-0.5 bg-gray-800/60 relative">
                {isSimActive && (
                  <span className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Node Type Icon Helper Component
function NodeIcon({ 
  type, 
  channel, 
  size = 14,
  className 
}: { 
  type: FlowNode["type"]; 
  channel?: FlowNode["channel"]; 
  size?: number;
  className?: string;
}) {
  if (type === "delay") return <Clock size={size} className={className} />;
  if (type === "condition") return <GitFork size={size} className={className} />;
  
  if (channel === "whatsapp") return <MessageSquare size={size} className={className} />;
  if (channel === "email") return <Mail size={size} className={className} />;
  return <Smartphone size={size} className={className} />;
}

// Add Node Dropdown Button Component
function AddNodeDropdown({ 
  onAdd,
  small = false 
}: { 
  onAdd: (type: "action" | "delay" | "condition", channel?: "whatsapp" | "email" | "sms") => void;
  small?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 bg-[#121216] border border-gray-800/80 hover:bg-gray-800/80 hover:border-gray-750 text-gray-300 font-bold rounded-xl shadow-xl transition-all duration-200 hover:-translate-y-0.5 ${
          small ? "px-2.5 py-1 text-[10px]" : "px-4 py-2 text-xs"
        }`}
      >
        <Plus size={small ? 12 : 14} className="text-purple-400" />
        Insert Step
      </button>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2.5 w-[190px] bg-[#0c0c0f] border border-gray-800/80 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 select-none animate-[speediq-fadeSlide_0.15s_ease-out_forwards]">
          <span className="text-[9px] text-gray-500 font-mono font-bold px-2 py-1 uppercase block tracking-wider">Outbound Action</span>
          <button
            onClick={() => { onAdd("action", "whatsapp"); setIsOpen(false); }}
            className="w-full text-left inline-flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-[#121216] text-gray-300 hover:text-white transition"
          >
            <MessageSquare size={13} className="text-emerald-400" />
            WhatsApp template
          </button>
          <button
            onClick={() => { onAdd("action", "email"); setIsOpen(false); }}
            className="w-full text-left inline-flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-[#121216] text-gray-300 hover:text-white transition"
          >
            <Mail size={13} className="text-blue-400" />
            Email dispatch
          </button>
          <button
            onClick={() => { onAdd("action", "sms"); setIsOpen(false); }}
            className="w-full text-left inline-flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-[#121216] text-gray-300 hover:text-white transition"
          >
            <Smartphone size={13} className="text-amber-500" />
            SMS content
          </button>
          
          <div className="border-t border-gray-900/60 my-1.5"></div>
          
          <span className="text-[9px] text-gray-500 font-mono font-bold px-2 py-1 uppercase block tracking-wider">Delay & Split</span>
          <button
            onClick={() => { onAdd("delay"); setIsOpen(false); }}
            className="w-full text-left inline-flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-[#121216] text-gray-300 hover:text-white transition"
          >
            <Clock size={13} className="text-purple-400" />
            Wait delay timer
          </button>
          <button
            onClick={() => { onAdd("condition"); setIsOpen(false); }}
            className="w-full text-left inline-flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs hover:bg-[#121216] text-gray-300 hover:text-white transition"
          >
            <GitFork size={13} className="text-pink-400" />
            Conditional split
          </button>
        </div>
      )}
    </div>
  );
}
