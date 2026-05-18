"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import type { MentionableArtist } from "@/lib/artist-mentions";
import { findActiveMentionQuery, getMentionSuggestions } from "@/lib/bio-mention-typeahead";

function BioEditorToolbar({
  editor,
  mentionTargets,
}: {
  editor: Editor | null;
  mentionTargets: MentionableArtist[];
}) {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt("Enter image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const setLink = () => {
    const url = window.prompt("Enter URL");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
  };

  const bar = "flex flex-wrap gap-1 border border-b-0 rounded-t-md p-2 ";
  const btnBase = "px-2 py-1 text-sm rounded min-w-[44px] min-h-[44px] ";
  const btnOn = "bg-stone-700 text-white ";
  const btnOff = "bg-white border ";

  return (
    <div className={`${bar} border-stone-300 bg-stone-100`}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btnBase} font-bold ${editor.isActive("bold") ? btnOn : `${btnOff}border-stone-300 text-stone-800`}`}
        aria-label="Bold"
      >
        B
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btnBase} italic ${editor.isActive("italic") ? btnOn : `${btnOff}border-stone-300 text-stone-800`}`}
        aria-label="Italic"
      >
        I
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={setLink}
        className={`${btnBase} ${editor.isActive("link") ? btnOn : `${btnOff}border-stone-300 text-stone-800`}`}
        aria-label="Link"
      >
        🔗
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={addImage}
        className={`${btnBase} ${btnOff}border-stone-300 text-stone-800`}
        aria-label="Insert image"
      >
        🖼
      </button>
      {mentionTargets.length > 0 && (
        <p className="my-auto ml-auto px-2 text-xs text-stone-500">Type @ to mention a connection</p>
      )}
    </div>
  );
}

type MentionMenuState = {
  activeIndex: number;
  from: number;
  left: number;
  query: string;
  suggestions: MentionableArtist[];
  top: number;
  to: number;
};

type BioRichTextEditorProps = {
  initialHtml: string;
  onHtmlChange: (html: string) => void;
  disabled?: boolean;
  mentionTargets?: MentionableArtist[];
};

/**
 * Tiptap bio editor aligned with the public registration form (StarterKit + image + link).
 */
export function BioRichTextEditor({
  initialHtml,
  onHtmlChange,
  disabled,
  mentionTargets = [],
}: BioRichTextEditorProps) {
  const prevInitialRef = useRef(initialHtml);
  const onHtmlChangeRef = useRef(onHtmlChange);
  /** Coalesce TipTap updates to one rAF so undo/redo and fast typing stay in sync with React state (no 300ms dirty lag). */
  const htmlRafRef = useRef<number | null>(null);
  const [mentionMenu, setMentionMenu] = useState<MentionMenuState | null>(null);
  const mentionMenuRef = useRef<MentionMenuState | null>(null);

  const editorRef = useRef<Editor | null>(null);
  const editorShellRef = useRef<HTMLDivElement | null>(null);
  const setMentionMenuState = useCallback((next: MentionMenuState | null) => {
    mentionMenuRef.current = next;
    setMentionMenu(next);
  }, []);

  const syncMentionMenu = useCallback((currentEditor: Editor | null) => {
    if (!currentEditor || disabled || mentionTargets.length === 0) {
      setMentionMenuState(null);
      return;
    }

    const { selection, doc } = currentEditor.state;
    if (!selection.empty) {
      setMentionMenuState(null);
      return;
    }

    const cursorPos = selection.from;
    const textBeforeCursor = doc.textBetween(selection.$from.start(), cursorPos, "\n", "\0");
    const activeQuery = findActiveMentionQuery(textBeforeCursor, cursorPos);

    if (!activeQuery) {
      setMentionMenuState(null);
      return;
    }

    const suggestions = getMentionSuggestions(mentionTargets, activeQuery.query);
    if (suggestions.length === 0) {
      setMentionMenuState(null);
      return;
    }

    const shellRect = editorShellRef.current?.getBoundingClientRect();
    const caretRect = currentEditor.view.coordsAtPos(activeQuery.to);
    const menuWidth = shellRect ? Math.min(shellRect.width - 16, 320) : 320;
    const left = shellRect
      ? Math.max(8, Math.min(caretRect.left - shellRect.left, shellRect.width - menuWidth - 8))
      : 8;
    const top = shellRect ? caretRect.bottom - shellRect.top + 6 : 8;

    const previous = mentionMenuRef.current;
    const previousId = previous?.suggestions[previous.activeIndex]?.id;
    const activeIndex = Math.max(
      0,
      previousId ? suggestions.findIndex((artist) => artist.id === previousId) : 0,
    );

    setMentionMenuState({
      ...activeQuery,
      suggestions,
      activeIndex: activeIndex >= 0 ? activeIndex : 0,
      left,
      top,
    });
  }, [disabled, mentionTargets, setMentionMenuState]);

  const applyMentionSelection = useCallback((target: MentionableArtist) => {
    const currentEditor = editorRef.current;
    const currentMenu = mentionMenuRef.current;
    if (!currentEditor || !currentMenu) return;

    setMentionMenuState(null);
    currentEditor
      .chain()
      .focus()
      .insertContentAt({ from: currentMenu.from, to: currentMenu.to }, `${target.tag} `)
      .run();
  }, [setMentionMenuState]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TiptapImage, TiptapLink.configure({ openOnClick: false })],
    content: initialHtml || "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-stone max-w-measure min-h-[12rem] cursor-text px-4 py-4 text-left font-sans leading-relaxed text-stone-800 outline-none focus:outline-none sm:prose-base",
      },
      handleKeyDown: (_view, event) => {
        const currentMenu = mentionMenuRef.current;
        if (!currentMenu) return false;

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setMentionMenuState({
            ...currentMenu,
            activeIndex: (currentMenu.activeIndex + 1) % currentMenu.suggestions.length,
          });
          return true;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setMentionMenuState({
            ...currentMenu,
            activeIndex:
              (currentMenu.activeIndex - 1 + currentMenu.suggestions.length) %
              currentMenu.suggestions.length,
          });
          return true;
        }

        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          applyMentionSelection(currentMenu.suggestions[currentMenu.activeIndex]);
          return true;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          setMentionMenuState(null);
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (htmlRafRef.current != null) cancelAnimationFrame(htmlRafRef.current);
      htmlRafRef.current = requestAnimationFrame(() => {
        htmlRafRef.current = null;
        onHtmlChangeRef.current(ed.getHTML());
      });
      syncMentionMenu(ed);
    },
  });

  useEffect(() => {
    onHtmlChangeRef.current = onHtmlChange;
  }, [onHtmlChange]);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    return () => {
      if (htmlRafRef.current != null) cancelAnimationFrame(htmlRafRef.current);
      const ed = editorRef.current;
      if (ed) onHtmlChangeRef.current(ed.getHTML());
    };
  }, []);

  useEffect(() => {
    if (!editor) return;
    if (prevInitialRef.current === initialHtml) return;
    prevInitialRef.current = initialHtml;
    editor.commands.setContent(initialHtml || "<p></p>", { emitUpdate: false });
    queueMicrotask(() => syncMentionMenu(editor));
  }, [initialHtml, editor, syncMentionMenu]);

  useEffect(() => {
    queueMicrotask(() => syncMentionMenu(editorRef.current));
  }, [disabled, mentionTargets, syncMentionMenu]);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => syncMentionMenu(editor);
    const handleBlur = () => setMentionMenuState(null);

    editor.on("selectionUpdate", handleSelectionUpdate);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
      editor.off("blur", handleBlur);
    };
  }, [editor, syncMentionMenu, setMentionMenuState]);

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      <BioEditorToolbar editor={editor} mentionTargets={mentionTargets} />
      <div ref={editorShellRef} className="relative">
        {mentionMenu && (
          <div
            className="absolute z-20 w-[min(calc(100%-16px),20rem)]"
            style={{ left: mentionMenu.left, top: mentionMenu.top }}
          >
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white/95 shadow-lg backdrop-blur">
              {mentionMenu.suggestions.map((artist, index) => (
                <button
                  key={artist.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyMentionSelection(artist)}
                  className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm ${
                    index === mentionMenu.activeIndex
                      ? "bg-amber-100 text-stone-900"
                      : "bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span className="font-medium">{artist.fullName}</span>
                  <span className="shrink-0 text-xs text-stone-500">{artist.tag}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <EditorContent
          editor={editor}
          className="rounded-b-md border border-t-0 border-stone-300 bg-white focus-within:ring-2 focus-within:ring-amber-500"
        />
      </div>
    </div>
  );
}
