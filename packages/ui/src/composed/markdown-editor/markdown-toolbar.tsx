"use client";

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  UndoRedo,
} from "@mdxeditor/editor";

/**
 * Custom Markdown Toolbar for MDXEditor
 *
 * Note: Lexical/MDXEditor does NOT use .chain() like Tiptap.
 * Actions are handled by the components themselves or via editor commands.
 */
export const MarkdownToolbar = () => {
  return (
    <DiffSourceToggleWrapper>
      <div className="flex flex-wrap items-center gap-1 p-1">
        <UndoRedo />
        <div className="mx-1 h-6 w-px bg-border" />
        <BlockTypeSelect />
        <div className="mx-1 h-6 w-px bg-border" />
        <BoldItalicUnderlineToggles />
        <div className="mx-1 h-6 w-px bg-border" />
        <ListsToggle />
        <div className="mx-1 h-6 w-px bg-border" />
        <CreateLink />
        <InsertImage />
        <InsertTable />
        <InsertThematicBreak />
        <InsertCodeBlock />
      </div>
    </DiffSourceToggleWrapper>
  );
};

export default MarkdownToolbar;
