import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { FileText, Folder, Plus, Save, Trash2 } from "lucide-react";
import type { NoteTreeNode } from "../../contracts/schemas";
import { notesApi } from "../../data/api";
import { useShellStore } from "../../state/shell";
import { MarkdownView } from "../../components/chat/MarkdownView";
import {
  AsyncState,
  Badge,
  Button,
  Dialog,
  Field,
  Input,
} from "../../components/ui";
import { SectionPage } from "../layout";
import pageStyles from "../pages.module.css";
import styles from "./knowledge.module.css";
const MarkdownCodeEditor = lazy(
  () => import("../../components/editors/MarkdownCodeEditor"),
);

function flattenNotes(
  nodes: NoteTreeNode[],
  depth = 0,
): Array<NoteTreeNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...(node.children ? flattenNotes(node.children, depth + 1) : []),
  ]);
}

export default function KnowledgeNotes() {
  const client = useQueryClient();
  const theme = useShellStore((state) => state.theme);
  const tree = useQuery({
    queryKey: ["notes", "tree"],
    queryFn: () => notesApi.tree(),
  });
  const [selectedPath, setSelectedPath] = useState("");
  const note = useQuery({
    queryKey: ["notes", "file", selectedPath],
    queryFn: () => notesApi.file(selectedPath),
    enabled: Boolean(selectedPath),
  });
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("新笔记.md");
  useEffect(() => {
    if (note.data) setDraft(note.data.content);
  }, [note.data]);
  const save = useMutation({
    mutationFn: () => notesApi.updateFile(selectedPath, draft),
    onSuccess: (data) =>
      client.setQueryData(["notes", "file", selectedPath], data),
  });
  const create = useMutation({
    mutationFn: () => notesApi.createFile("", newName, "# 新笔记\n"),
    onSuccess: (data) => {
      setCreateOpen(false);
      setSelectedPath(data.path);
      void client.invalidateQueries({ queryKey: ["notes", "tree"] });
    },
  });
  const remove = useMutation({
    mutationFn: () => notesApi.deleteFile(selectedPath),
    onSuccess: () => {
      setSelectedPath("");
      setDraft("");
      void client.invalidateQueries({ queryKey: ["notes", "tree"] });
    },
  });
  const nodes = flattenNotes(tree.data ?? []);
  return (
    <SectionPage>
      <div className={pageStyles.split}>
        <aside className={pageStyles.splitAside}>
          <div className={pageStyles.toolbar}>
            <strong>笔记目录</strong>
            <Button size="small" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              新建
            </Button>
          </div>
          <AsyncState
            loading={tree.isLoading}
            error={tree.error}
            empty={!nodes.length}
          >
            <div className={styles.treeList}>
              {nodes.map((node) => (
                <button
                  key={node.relativePath}
                  type="button"
                  style={{ paddingLeft: 10 + node.depth * 14 }}
                  disabled={node.type === "dir"}
                  className={
                    selectedPath === node.relativePath ? styles.treeActive : ""
                  }
                  onClick={() =>
                    node.type === "file" && setSelectedPath(node.relativePath)
                  }
                >
                  {node.type === "dir" ? (
                    <Folder size={14} />
                  ) : (
                    <FileText size={14} />
                  )}
                  <span>{node.name}</span>
                </button>
              ))}
            </div>
          </AsyncState>
        </aside>
        <section className={`${pageStyles.splitMain} ${styles.noteEditor}`}>
          <div className={pageStyles.toolbar}>
            <div className={pageStyles.toolbarGroup}>
              <strong>{note.data?.name || "选择一篇笔记"}</strong>
              {selectedPath ? <Badge>{selectedPath}</Badge> : null}
            </div>
            <div className={pageStyles.toolbarGroup}>
              <Button
                size="small"
                onClick={() => setPreview(!preview)}
                disabled={!selectedPath}
              >
                {preview ? "编辑" : "预览"}
              </Button>
              <Button
                size="small"
                variant="danger"
                onClick={() => remove.mutate()}
                disabled={!selectedPath}
              >
                <Trash2 size={14} />
              </Button>
              <Button
                size="small"
                variant="primary"
                onClick={() => save.mutate()}
                disabled={!selectedPath || save.isPending}
              >
                <Save size={14} />
                保存
              </Button>
            </div>
          </div>
          <AsyncState
            loading={note.isLoading}
            error={note.error}
            empty={!selectedPath}
          >
            {preview ? (
              <div className={styles.markdownPreview}>
                <MarkdownView content={draft} />
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className={pageStyles.loadingPanel}>
                    正在载入 Markdown 编辑器
                  </div>
                }
              >
                <MarkdownCodeEditor
                  value={draft}
                  onChange={setDraft}
                  theme={theme}
                  height="100%"
                />
              </Suspense>
            )}
          </AsyncState>
        </section>
      </div>
      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="新建笔记"
        footer={
          <Button
            variant="primary"
            onClick={() => create.mutate()}
            disabled={!newName.trim()}
          >
            创建
          </Button>
        }
      >
        <Field label="文件名">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
        </Field>
      </Dialog>
    </SectionPage>
  );
}
