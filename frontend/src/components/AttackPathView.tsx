import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  NodeProps,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

const nodeColors: Record<string, string> = {
  domain: '#818cf8',
  subdomain: '#34d399',
  service: '#f59e0b',
  vuln: '#ef4444',
  ip: '#6366f1',
};

const nodeIcons: Record<string, string> = {
  domain: '🌐',
  subdomain: '🔗',
  service: '⚙️',
  vuln: '💥',
  ip: '🖥️',
};

function AttackPathNodeComponent({ data }: NodeProps) {
  const mitre = data.mitre;
  return (
    <div
      className="rounded-lg px-4 py-2 shadow-lg border"
      style={{
        background: `${data.color}22`,
        borderColor: `${data.color}66`,
        color: '#fff',
        minWidth: 120,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span>{data.icon}</span>
        <span className="truncate max-w-[120px]">{data.label}</span>
      </div>
      {data.severity && (
        <div className="text-[10px] mt-1 opacity-70">{data.severity}</div>
      )}
      {mitre && mitre.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {mitre.slice(0, 1).map((m: any, i: number) => (
            <div
              key={i}
              className="text-[8px] px-1.5 py-0.5 rounded inline-block"
              style={{ background: `${data.color}33`, color: data.color }}
            >
              {m.technique_id}
            </div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
}

const nodeTypes = { attackPathNode: AttackPathNodeComponent };

const getLayoutedElements = (nodes: any[], edges: any[]) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80, marginx: 20, marginy: 20 });

  nodes.forEach((n) => g.setNode(n.id, { width: 160, height: 80 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - 80, y: pos.y - 40 },
    };
  });
};

export function AttackPathView({ nodes: rawNodes }: { nodes: any[] }) {
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!rawNodes || rawNodes.length === 0) return { initialNodes: [], initialEdges: [] };

    // Flatten nodes: find all children recursively
    const nodeMap = new Map(rawNodes.map((n: any) => [n.id, n]));
    const flatNodes: any[] = [];
    const edges: any[] = [];

    // BFS to flatten
    const queue = ['root'];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const n = nodeMap.get(id);
      if (!n) continue;
      flatNodes.push(n);
      if (n.children) {
        for (const childId of n.children) {
          edges.push({
            id: `e-${id}-${childId}`,
            source: id,
            target: childId,
            animated: true,
            style: { stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.3)' },
          });
          queue.push(childId);
        }
      }
    }

    const flowNodes = flatNodes.map((n: any, i: number) => ({
      id: n.id,
      type: 'attackPathNode',
      position: { x: 0, y: 0 },
      data: {
        label: n.label,
        severity: n.severity,
        icon: nodeIcons[n.type] || '🔹',
        color: nodeColors[n.type] || '#6b7280',
        mitre: n.data?.mitre || null,
      },
    }));

    const layouted = getLayoutedElements(flowNodes, edges);
    return { initialNodes: layouted, initialEdges: edges };
  }, [rawNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (!rawNodes || rawNodes.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 overflow-hidden flex items-center justify-center" style={{ height: '300px', background: 'rgba(0,0,0,0.2)' }}>
        <span className="text-slate-500 text-xs rp-mono">No attack path data available</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden" style={{ height: '450px', background: 'rgba(0,0,0,0.3)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Controls style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
        <MiniMap
          style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
          nodeColor={(n) => n.data?.severity === 'Critical' ? '#ef4444' : '#6b7280'}
          nodeStrokeColor={(n) => n.data?.color || '#555'}
        />
        <Background color="rgba(255,255,255,0.05)" gap={20} />
      </ReactFlow>
    </div>
  );
}
