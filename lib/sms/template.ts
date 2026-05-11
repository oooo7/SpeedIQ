export function renderSmsTemplate(body: string, variables: Record<string, string>): string {
  let rendered = body ?? "";
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{\\s*${escapeRegex(key)}\\s*\\}\\}`, "g");
    rendered = rendered.replace(pattern, value ?? "");
  }
  return rendered;
}

export function extractTemplateVariables(body: string): string[] {
  const matches = body.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "").trim()))];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
