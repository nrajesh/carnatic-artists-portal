"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";

function BioEditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
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

  const bar =
    "flex flex-wrap gap-1 border border-b-0 rounded-t-md p-2 ";
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
    </div>
  );
}

type BioRichTextEditorProps = {
  initialHtml: string;
  onHtmlChange: (html: string) => void;
  disabled?: boolean;
};

/**
 * Tiptap bio editor aligned with the public registration form (StarterKit + image + link).
 */
export function BioRichTextEditor({ initialHtml, onHtmlChange, disabled }: BioRichTextEditorProps) {
  const prevInitialRef = useRef(initialHtml);
  const onHtmlChangeRef = useRef(onHtmlChange);
  /** Coalesce TipTap updates to one rAF so undo/redo and fast typing stay in sync with React state (no 300ms dirty lag). */
  const htmlRafRef = useRef<number | null>(null);

  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TiptapImage,
      TiptapLink.configure({ openOnClick: false }),
    ],
    content: initialHtml || "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-stone max-w-measure min-h-[12rem] cursor-text px-4 py-4 text-left font-sans leading-relaxed text-stone-800 outline-none focus:outline-none sm:prose-base",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (htmlRafRef.current != null) cancelAnimationFrame(htmlRafRef.current);
      htmlRafRef.current = requestAnimationFrame(() => {
        htmlRafRef.current = null;
        onHtmlChangeRef.current(ed.getHTML());
      });
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
    editor.commands.setContent(initialHtml || "<p></p>", false);
  }, [initialHtml, editor]);

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      <BioEditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="rounded-b-md border border-t-0 border-stone-300 bg-white focus-within:ring-2 focus-within:ring-amber-500"
      />
    </div>
  );
}
