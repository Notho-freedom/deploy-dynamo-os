import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, File as FileIcon, Folder, FolderOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GhTreeEntry } from '@/lib/github';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children: TreeNode[];
  size?: number;
}

function buildTree(entries: GhTreeEntry[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', type: 'dir', children: [] };
  for (const entry of entries) {
    if (entry.type === 'commit') continue;
    const parts = entry.path.split('/');
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let next = cur.children.find((n) => n.name === part);
      if (!next) {
        next = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          type: isLast && entry.type === 'blob' ? 'file' : 'dir',
          children: [],
          size: isLast && entry.type === 'blob' ? entry.size : undefined,
        };
        cur.children.push(next);
      }
      cur = next;
    }
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sort(n.children));
  };
  sort(root.children);
  return root.children;
}

export function FileTree({
  entries,
  selectedPath,
  onSelect,
  loading,
  className,
}: {
  entries: GhTreeEntry[];
  selectedPath?: string;
  onSelect: (path: string) => void;
  loading?: boolean;
  className?: string;
}) {
  const nodes = useMemo(() => buildTree(entries), [entries]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['src', 'public', 'app']));

  // Auto-expand parents of selected path
  useEffect(() => {
    if (!selectedPath) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      const parts = selectedPath.split('/');
      for (let i = 1; i < parts.length; i++) next.add(parts.slice(0, i).join('/'));
      return next;
    });
  }, [selectedPath]);

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  if (loading) {
    return (
      <div className={cn('flex h-full items-center justify-center text-[12px] text-muted-foreground', className)}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading tree…
      </div>
    );
  }

  return (
    <div className={cn('overflow-auto p-1 text-[12.5px]', className)}>
      {nodes.length === 0 ? (
        <p className="p-3 text-[12px] text-muted-foreground">Empty repository.</p>
      ) : (
        nodes.map((node) => <TreeRow key={node.path} node={node} depth={0} expanded={expanded} onToggle={toggle} onSelect={onSelect} selectedPath={selectedPath} />)
      )}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
  onSelect,
  selectedPath,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  selectedPath?: string;
}) {
  const isOpen = expanded.has(node.path);
  const isSelected = selectedPath === node.path;
  if (node.type === 'dir') {
    return (
      <>
        <button
          onClick={() => onToggle(node.path)}
          className={cn(
            'flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-muted-foreground hover:bg-muted/40 hover:text-foreground',
          )}
          style={{ paddingLeft: 6 + depth * 12 }}
        >
          {isOpen ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          {isOpen ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400/80" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />}
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children.map((child) => (
          <TreeRow key={child.path} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} onSelect={onSelect} selectedPath={selectedPath} />
        ))}
      </>
    );
  }
  return (
    <button
      onClick={() => onSelect(node.path)}
      className={cn(
        'flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left',
        isSelected ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
      )}
      style={{ paddingLeft: 6 + depth * 12 + 14 }}
    >
      <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}
