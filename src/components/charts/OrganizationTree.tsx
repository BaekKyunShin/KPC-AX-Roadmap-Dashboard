'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PBLOrgTreeNode } from '@/lib/schemas/interview-pbl';

/**
 * OrganizationTree — PBL 양식 Ⅱ-1-나 조직도 (재귀 트리) 입력 위젯
 *
 * 양식 원본의 조직도 블록 (부서/팀명 + 하위 부서) 을 n-depth 트리로 입력한다.
 * 노드 1개 = (id, name, children[]). 자기참조 구조이므로 재귀 렌더 + 재귀 업데이트.
 *
 * - 각 노드 이름은 text input 으로 편집 (disabled = readOnly).
 * - "자식 노드 추가" 버튼은 해당 노드의 children 에 빈 노드를 추가한다.
 * - "삭제" 버튼은 해당 노드와 그 하위를 모두 제거한다.
 * - 루트 레벨에서는 상단 "루트 노드 추가" 버튼으로 최상위 부서를 추가한다.
 *
 * React 키는 노드 id (crypto.randomUUID) 로 안정적. index 키 금지.
 */

export interface OrganizationTreeProps {
  value: PBLOrgTreeNode[];
  onChange: (next: PBLOrgTreeNode[]) => void;
  readOnly?: boolean;
}

function createEmptyNode(): PBLOrgTreeNode {
  return { id: crypto.randomUUID(), name: '', children: [] };
}

/**
 * 재귀적으로 트리 노드를 변환. path 는 루트부터 대상 노드까지의 인덱스 경로.
 * path.length === 0 이면 array 전체를 교체하는 경우이므로 이 헬퍼는 사용하지 않는다.
 */
function updateNodeAtPath(
  nodes: PBLOrgTreeNode[],
  path: number[],
  updater: (node: PBLOrgTreeNode) => PBLOrgTreeNode,
): PBLOrgTreeNode[] {
  if (path.length === 0) return nodes;
  const [head, ...rest] = path;
  return nodes.map((n, i) => {
    if (i !== head) return n;
    if (rest.length === 0) return updater(n);
    return { ...n, children: updateNodeAtPath(n.children, rest, updater) };
  });
}

function removeNodeAtPath(
  nodes: PBLOrgTreeNode[],
  path: number[],
): PBLOrgTreeNode[] {
  if (path.length === 0) return nodes;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return nodes.filter((_, i) => i !== head);
  }
  return nodes.map((n, i) => {
    if (i !== head) return n;
    return { ...n, children: removeNodeAtPath(n.children, rest) };
  });
}

interface NodeRowProps {
  node: PBLOrgTreeNode;
  path: number[];
  depth: number;
  readOnly: boolean;
  onRename: (path: number[], name: string) => void;
  onAddChild: (path: number[]) => void;
  onRemove: (path: number[]) => void;
}

function NodeRow({
  node,
  path,
  depth,
  readOnly,
  onRename,
  onAddChild,
  onRemove,
}: NodeRowProps) {
  const labelBase = node.name.trim() || '이름 미입력';
  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center gap-2 rounded border border-border bg-card px-2 py-1.5',
        )}
        style={{ marginLeft: depth * 16 }}
      >
        <input
          type="text"
          value={node.name}
          onChange={(e) => onRename(path, e.target.value)}
          placeholder="부서·팀명"
          disabled={readOnly}
          aria-label={`조직 노드 이름 (${labelBase})`}
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={() => onAddChild(path)}
              aria-label={`${labelBase} 자식 노드 추가`}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(path)}
              aria-label={`${labelBase} 삭제`}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </>
        )}
      </div>
      {node.children.length > 0 && (
        <div className="space-y-2">
          {node.children.map((child, idx) => (
            <NodeRow
              key={child.id}
              node={child}
              path={[...path, idx]}
              depth={depth + 1}
              readOnly={readOnly}
              onRename={onRename}
              onAddChild={onAddChild}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrganizationTree({
  value,
  onChange,
  readOnly = false,
}: OrganizationTreeProps) {
  function handleRename(path: number[], name: string) {
    onChange(updateNodeAtPath(value, path, (n) => ({ ...n, name })));
  }

  function handleAddChild(path: number[]) {
    onChange(
      updateNodeAtPath(value, path, (n) => ({
        ...n,
        children: [...n.children, createEmptyNode()],
      })),
    );
  }

  function handleRemove(path: number[]) {
    onChange(removeNodeAtPath(value, path));
  }

  function handleAddRoot() {
    onChange([...value, createEmptyNode()]);
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {value.map((node, idx) => (
          <NodeRow
            key={node.id}
            node={node}
            path={[idx]}
            depth={0}
            readOnly={readOnly}
            onRename={handleRename}
            onAddChild={handleAddChild}
            onRemove={handleRemove}
          />
        ))}
      </div>
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRoot}
          aria-label="루트 노드 추가"
        >
          <Plus className="mr-1 size-4" />
          루트 노드 추가
        </Button>
      )}
    </div>
  );
}
