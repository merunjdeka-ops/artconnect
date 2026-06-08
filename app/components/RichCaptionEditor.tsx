"use client";

import { useEffect, useRef, useState } from "react";

const EMOJIS = [
  "😀","😂","😍","🥰","😎","🤩","😢","😭","😡","🥳",
  "👏","🙌","🔥","❤️","💯","✨","🌟","🎉","🎶","🎸",
  "📸","🎨","🖌️","🎭","🎬","🎤","🎧","🎹","🥁","🎺",
  "🌸","🌿","🌊","🌙","⭐","☀️","🌈","🍀","🦋","🕊️",
  "👀","💪","🙏","👋","✌️","🤝","💬","💡","📍","🗓️",
  "🇮🇹","🏙️","🌍","🏔️","🌅","🌆","🎡","🏛️","🚀","💎",
];

const TOOLBAR_SECTIONS = [
  {
    label: "Format",
    buttons: [
      { cmd: "bold",          icon: "B",    title: "Bold",          style: "font-bold" },
      { cmd: "italic",        icon: "I",    title: "Italic",        style: "italic" },
      { cmd: "underline",     icon: "U",    title: "Underline",     style: "underline" },
      { cmd: "strikeThrough", icon: "S̶",   title: "Strikethrough", style: "line-through" },
    ],
  },
  {
    label: "Align",
    buttons: [
      { cmd: "justifyLeft",   icon: "≡",   title: "Align Left" },
      { cmd: "justifyCenter", icon: "≣",   title: "Align Center" },
      { cmd: "justifyRight",  icon: "≡",   title: "Align Right" },
    ],
  },
  {
    label: "List",
    buttons: [
      { cmd: "insertUnorderedList", icon: "•≡", title: "Bullet List" },
      { cmd: "insertOrderedList",   icon: "1≡", title: "Numbered List" },
    ],
  },
];

const FONT_SIZES = [
  { label: "Small",   value: "1" },
  { label: "Normal",  value: "3" },
  { label: "Large",   value: "5" },
  { label: "Huge",    value: "7" },
];

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichCaptionEditor({ value, onChange, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const savedSelection = useRef<Range | null>(null);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, []);

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelection.current);
    }
  }

  function updateActiveFormats() {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
    });
  }

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    onChange(editorRef.current?.innerHTML || "");
    updateActiveFormats();
  }

  function insertEmoji(emoji: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("insertText", false, emoji);
    onChange(editorRef.current?.innerHTML || "");
    setShowEmoji(false);
  }

  const isEmpty = !value || value === "<br>" || value === "";

  return (
    <div className="border border-black bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0 border-b border-black bg-[#F2EDE4] px-2 py-1.5">

        {TOOLBAR_SECTIONS.map((section, si) => (
          <div key={si} className="flex items-center">
            {section.buttons.map(btn => (
              <button
                key={btn.cmd}
                type="button"
                title={btn.title}
                onMouseDown={e => { e.preventDefault(); exec(btn.cmd); }}
                className={`w-8 h-8 text-sm flex items-center justify-center rounded transition-colors hover:bg-black/10 ${
                  activeFormats[btn.cmd] ? "bg-black text-white" : "text-black"
                } ${"style" in btn ? btn.style : ""}`}
              >
                {btn.icon}
              </button>
            ))}
            {si < TOOLBAR_SECTIONS.length - 1 && (
              <span className="w-px h-5 bg-black/20 mx-1.5" />
            )}
          </div>
        ))}

        {/* Font size */}
        <span className="w-px h-5 bg-black/20 mx-1.5" />
        <select
          onMouseDown={e => { saveSelection(); }}
          onChange={e => { restoreSelection(); exec("fontSize", e.target.value); }}
          className="h-7 text-xs border border-black/20 bg-white px-1 outline-none cursor-pointer"
          defaultValue="3"
        >
          {FONT_SIZES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Emoji button */}
        <span className="w-px h-5 bg-black/20 mx-1.5" />
        <div className="relative">
          <button
            type="button"
            title="Insert Emoji"
            onMouseDown={e => { e.preventDefault(); saveSelection(); setShowEmoji(v => !v); }}
            className="w-8 h-8 text-base flex items-center justify-center rounded hover:bg-black/10 transition-colors"
          >
            😊
          </button>
          {showEmoji && (
            <div className="absolute top-9 left-0 z-50 bg-white border border-black shadow-lg p-2 grid grid-cols-10 gap-0.5 w-64">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onMouseDown={ev => { ev.preventDefault(); insertEmoji(e); }}
                  className="w-6 h-6 text-sm flex items-center justify-center hover:bg-[#F2EDE4] rounded transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear formatting */}
        <span className="w-px h-5 bg-black/20 mx-1.5" />
        <button
          type="button"
          title="Clear Formatting"
          onMouseDown={e => { e.preventDefault(); exec("removeFormat"); }}
          className="w-8 h-8 text-xs flex items-center justify-center rounded hover:bg-black/10 transition-colors text-black/50 font-mono"
        >
          T̶
        </button>
      </div>

      {/* Editable area */}
      <div className="relative">
        {isEmpty && (
          <div className="absolute inset-0 px-4 py-3 text-sm text-black/30 pointer-events-none select-none">
            {placeholder || "Write your caption…"}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => { onChange(editorRef.current?.innerHTML || ""); }}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onSelect={updateActiveFormats}
          className="min-h-[100px] max-h-[280px] overflow-y-auto px-4 py-3 text-sm text-black outline-none leading-relaxed"
          style={{ wordBreak: "break-word" }}
        />
      </div>
    </div>
  );
}
