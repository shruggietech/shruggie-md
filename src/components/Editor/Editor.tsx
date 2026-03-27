import { useRef, useEffect, useMemo } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, lineNumbers, highlightActiveLine, keymap } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { search } from "@codemirror/search";
import { autocompletion } from "@codemirror/autocomplete";
import { lintGutter, linter as cmLinter, type Diagnostic } from "@codemirror/lint";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { getLinter } from "@/linters/index";

export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  engineId?: string;
  lintingEnabled?: boolean;
  activeLinter?: string;
  showLineNumbers?: boolean;
  wordWrap?: boolean;
}

const shruggieDarkTheme = EditorView.theme({
  "&": {
    color: "var(--color-text-primary)",
    backgroundColor: "var(--color-bg-tertiary)",
    fontFamily: "var(--font-editor)",
    fontSize: "var(--font-size-editor)",
  },
  ".cm-content": {
    caretColor: "var(--color-accent)",
    lineHeight: "var(--line-height-editor)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--color-accent)",
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "var(--color-accent-subtle)",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--color-bg-hover)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--color-bg-secondary)",
    color: "var(--color-text-tertiary)",
    border: "none",
    borderRight: "1px solid var(--color-border-primary)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--color-bg-hover)",
  },
  ".cm-searchMatch": {
    backgroundColor: "var(--color-accent-subtle)",
    outline: "1px solid var(--color-accent)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--color-bg-active)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border-primary)",
  },
});

const shruggieHighlightStyle = HighlightStyle.define([
  // Headings: bold, primary text color
  { tag: tags.heading, fontWeight: "bold", color: "var(--color-text-primary)" },
  // Bold/italic markers: dimmed
  { tag: tags.processingInstruction, color: "var(--color-text-tertiary)" },
  { tag: tags.emphasis, fontStyle: "italic", color: "var(--color-text-primary)" },
  { tag: tags.strong, fontWeight: "bold", color: "var(--color-text-primary)" },
  // Links: URL in secondary, text in accent
  { tag: tags.url, color: "var(--color-text-secondary)" },
  { tag: tags.link, color: "var(--color-accent)" },
  // Code: editor font, hover background
  {
    tag: tags.monospace,
    fontFamily: "var(--font-editor)",
    backgroundColor: "var(--color-bg-hover)",
  },
  // Blockquote: secondary text
  { tag: tags.quote, color: "var(--color-text-secondary)" },
  // List markers: accent
  { tag: tags.list, color: "var(--color-accent)" },
  // Comments: tertiary
  { tag: tags.comment, color: "var(--color-text-tertiary)" },
  // Content (meta): tertiary (for markdown formatting chars like **, _, etc.)
  { tag: tags.contentSeparator, color: "var(--color-text-tertiary)" },
]);

export function Editor({
  value,
  onChange,
  lintingEnabled = false,
  activeLinter = "markdownlint",
  showLineNumbers = true,
  wordWrap = true,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const lintingEnabledRef = useRef(lintingEnabled);
  const activeLinterRef = useRef(activeLinter);

  // Compartments for dynamic reconfiguration
  const lineNumbersCompartment = useRef(new Compartment());
  const wordWrapCompartment = useRef(new Compartment());

  // Keep refs in sync without recreating the editor
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    lintingEnabledRef.current = lintingEnabled;
  }, [lintingEnabled]);

  useEffect(() => {
    activeLinterRef.current = activeLinter;
  }, [activeLinter]);

  // Build the linter extension (stable reference via useMemo)
  const lintExtension = useMemo(
    () =>
      cmLinter(async (view) => {
        if (!lintingEnabledRef.current) return [];
        try {
          const adapter = getLinter(activeLinterRef.current);
          const diagnostics = await adapter.lint(view.state.doc.toString());
          return diagnostics.map<Diagnostic>((d) => ({
            from: d.from,
            to: d.to,
            severity: d.severity === "error" ? "error" : d.severity === "warning" ? "warning" : "info",
            message: `${d.ruleId}: ${d.message}`,
          }));
        } catch {
          return [];
        }
      }),
    [],
  );

  // Create the CodeMirror instance once
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbersCompartment.current.of(showLineNumbers ? lineNumbers() : []),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        search(),
        autocompletion(),
        lintGutter(),
        lintExtension,
        wordWrapCompartment.current.of(wordWrap ? EditorView.lineWrapping : []),
        shruggieDarkTheme,
        syntaxHighlighting(shruggieHighlightStyle),
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run once on mount — value updates are handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  // React to showLineNumbers changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: lineNumbersCompartment.current.reconfigure(
        showLineNumbers ? lineNumbers() : [],
      ),
    });
  }, [showLineNumbers]);

  // React to wordWrap changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: wordWrapCompartment.current.reconfigure(
        wordWrap ? EditorView.lineWrapping : [],
      ),
    });
  }, [wordWrap]);

  return (
    <div
      ref={containerRef}
      data-testid="editor-container"
      style={{
        flex: 1,
        overflow: "auto",
        height: "100%",
      }}
    />
  );
}
