"use client";

import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { useTheme } from "next-themes";

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export function HtmlEditor({
  value,
  onChange,
  placeholder,
  minHeight = "260px",
  className,
}: HtmlEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange]
  );

  return (
    <CodeMirror
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      minHeight={minHeight}
      className={className}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightActiveLine: true,
        bracketMatching: true,
        foldGutter: true,
        indentOnInput: true,
        syntaxHighlighting: true,
        autocompletion: true,
      }}
      theme={isDark ? vscodeDark : vscodeLight}
      extensions={[html()]}
      indentWithTab={true}
    />
  );
}
