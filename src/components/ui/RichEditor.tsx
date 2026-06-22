import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Code,
  Undo2,
  Redo2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { MOTION_FAST } from '@/lib/motion';
import { motion } from 'framer-motion';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichEditor({
  value,
  onChange,
  placeholder = '开始输入…',
  className,
  minHeight = 'calc(100vh - 220px)',
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div
      className={cn(
        'flex flex-col h-full border border-border rounded-[8px] bg-bg-surface overflow-hidden',
        className,
      )}
    >
      <MenuBar editor={editor} />
      <div className="flex-1 overflow-auto p-4 bg-bg-base">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none font-mono prose-headings:text-text-primary prose-p:text-text-primary prose-strong:text-text-primary prose-blockquote:text-text-secondary prose-blockquote:border-l-accent"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}

function MenuBar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const items = [
    {
      icon: Bold,
      label: '粗体',
      active: editor.isActive('bold'),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      icon: Italic,
      label: '斜体',
      active: editor.isActive('italic'),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      icon: Heading2,
      label: '标题 2',
      active: editor.isActive('heading', { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: Heading3,
      label: '标题 3',
      active: editor.isActive('heading', { level: 3 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: List,
      label: '无序列表',
      active: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: ListOrdered,
      label: '有序列表',
      active: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: Quote,
      label: '引用',
      active: editor.isActive('blockquote'),
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: Code,
      label: '行内代码',
      active: editor.isActive('code'),
      onClick: () => editor.chain().focus().toggleCode().run(),
    },
  ];

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-bg-elevated/40 flex-wrap">
      {items.map((item) => (
        <motion.button
          key={item.label}
          whileTap={{ scale: 0.94 }}
          transition={MOTION_FAST}
          type="button"
          onClick={item.onClick}
          title={item.label}
          className={cn(
            'p-1.5 rounded-[6px] transition-colors',
            item.active
              ? 'bg-accent/15 text-accent'
              : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary',
          )}
        >
          <item.icon className="h-4 w-4" />
        </motion.button>
      ))}
      <div className="w-px h-5 bg-border mx-1" />
      <motion.button
        whileTap={{ scale: 0.94 }}
        transition={MOTION_FAST}
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="撤销"
        className="p-1.5 rounded-[6px] text-text-secondary hover:bg-bg-surface hover:text-text-primary disabled:opacity-30"
      >
        <Undo2 className="h-4 w-4" />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.94 }}
        transition={MOTION_FAST}
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="重做"
        className="p-1.5 rounded-[6px] text-text-secondary hover:bg-bg-surface hover:text-text-primary disabled:opacity-30"
      >
        <Redo2 className="h-4 w-4" />
      </motion.button>
    </div>
  );
}
