import ReactECharts from 'echarts-for-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Expand, RotateCcw } from 'lucide-react';
import type { TextAssociationRules, TextCollocations, TextCooccurrence, TextNetwork, TextSankey, TextTerms } from '../../api/types';

function frame(title: string, child: ReactNode) {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {child}
    </section>
  );
}

export function TermTreemap({ data }: { data?: TextTerms }) {
  const { t } = useTranslation();
  const groups = useMemo(() => {
    const map = new Map<number, Array<{ name: string; value: number }>>();
    (data?.terms ?? []).forEach((term) => {
      const group = map.get(term.community_id) ?? [];
      group.push({ name: term.term, value: term.term_count });
      map.set(term.community_id, group);
    });
    return Array.from(map.entries()).map(([community, children]) => ({ name: `C${community}`, children }));
  }, [data]);
  return frame(t('textMining.termCommunities'), (
    <ReactECharts
      style={{ height: 380 }}
      option={{
        tooltip: { trigger: 'item' },
        series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, data: groups }],
      }}
    />
  ));
}

export function CooccurrenceNetworkChart({ data }: { data?: TextNetwork }) {
  const { t } = useTranslation();
  return frame(t('textMining.cooccurrenceNetwork'), (
    <ReactECharts
      style={{ height: 520 }}
      option={{
        tooltip: { formatter: (params: { data?: { name?: string; value?: number; pmi?: number } }) => params.data?.name ?? `PMI ${params.data?.pmi?.toFixed?.(2) ?? ''}` },
        legend: { show: false },
        series: [{
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          force: { repulsion: 180, edgeLength: [40, 150] },
          label: { show: true, fontSize: 10 },
          data: (data?.nodes ?? []).map((node) => ({
            id: node.id,
            name: node.name,
            value: node.value,
            symbolSize: Math.max(10, Math.min(42, Math.sqrt(node.value) * 5)),
            category: node.community_id,
          })),
          links: (data?.edges ?? []).map((edge) => ({ source: edge.source, target: edge.target, value: edge.value, pmi: edge.pmi, lineStyle: { width: Math.max(1, Math.min(8, edge.value / 2)) } })),
          categories: Array.from(new Set((data?.nodes ?? []).map((node) => node.community_id))).map((id) => ({ name: String(id) })),
          emphasis: { focus: 'adjacency' },
        }],
      }}
    />
  ));
}

export function CooccurrenceNetworkWorkbench({
  network,
  terms,
  collocations,
  rules,
}: {
  network?: TextNetwork;
  terms?: TextTerms;
  collocations?: TextCollocations;
  rules?: TextAssociationRules;
}) {
  const { t } = useTranslation();
  const [minWeight, setMinWeight] = useState(1);
  const [nodeLimit, setNodeLimit] = useState(80);
  const [layout, setLayout] = useState<'force' | 'circular'>('force');
  const [repulsion, setRepulsion] = useState(260);
  const [edgeLength, setEdgeLength] = useState(120);
  const [labelMode, setLabelMode] = useState<'always' | 'hover' | 'selected'>('always');
  const [nodeSizeBy, setNodeSizeBy] = useState<'value' | 'pagerank'>('value');
  const [selectedCommunity, setSelectedCommunity] = useState<number | 'all'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  const termById = useMemo(() => new Map((terms?.terms ?? []).map((term) => [term.term, term])), [terms]);
  const communities = useMemo(() => Array.from(new Set((network?.nodes ?? []).map((node) => node.community_id))).sort((a, b) => a - b), [network]);
  const filtered = useMemo(() => {
    const baseNodes = (network?.nodes ?? [])
      .filter((node) => selectedCommunity === 'all' || node.community_id === selectedCommunity)
      .sort((a, b) => b.value - a.value)
      .slice(0, nodeLimit);
    const ids = new Set(baseNodes.map((node) => node.id));
    const edges = (network?.edges ?? []).filter((edge) => ids.has(edge.source) && ids.has(edge.target) && edge.value >= minWeight);
    const connectedIds = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
    const nodes = baseNodes.filter((node) => connectedIds.has(node.id) || node.id === selectedNodeId);
    return { nodes, edges };
  }, [network, selectedCommunity, nodeLimit, minWeight, selectedNodeId]);

  const selectedNode = filtered.nodes.find((node) => node.id === selectedNodeId) ?? (network?.nodes ?? []).find((node) => node.id === selectedNodeId);
  const neighborEdges = useMemo(
    () => (network?.edges ?? [])
      .filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId)
      .sort((a, b) => b.value - a.value || b.pmi - a.pmi)
      .slice(0, 12),
    [network, selectedNodeId],
  );
  const relatedCollocations = useMemo(
    () => (collocations?.collocations ?? []).filter((row) => selectedNodeId && row.phrase.split(' ').includes(selectedNodeId)).slice(0, 8),
    [collocations, selectedNodeId],
  );
  const relatedRules = useMemo(
    () => (rules?.rules ?? []).filter((rule) => selectedNodeId && (rule.antecedent.includes(selectedNodeId) || rule.consequent.includes(selectedNodeId))).slice(0, 8),
    [rules, selectedNodeId],
  );
  const option = useMemo(() => {
    const neighborIds = new Set(neighborEdges.flatMap((edge) => [edge.source, edge.target]));
    return {
      tooltip: {
        formatter: (params: { dataType?: string; data?: { name?: string; value?: number; degree?: number; pagerank?: number; community_id?: number; pmi?: number } }) => {
          if (params.dataType === 'edge') return `PMI ${Number(params.data?.pmi ?? 0).toFixed(2)}`;
          return `${params.data?.name ?? ''}<br/>count ${params.data?.value ?? 0}<br/>degree ${params.data?.degree ?? 0}<br/>pagerank ${Number(params.data?.pagerank ?? 0).toFixed(3)}<br/>C${params.data?.community_id ?? '-'}`;
        },
      },
      legend: { top: 0, type: 'scroll' },
      animationDurationUpdate: 450,
      series: [{
        type: 'graph',
        layout,
        roam: true,
        draggable: true,
        categories: communities.map((id) => ({ name: `C${id}` })),
        force: { repulsion, edgeLength: [Math.max(30, edgeLength - 40), edgeLength + 80], gravity: 0.08 },
        circular: { rotateLabel: true },
        label: {
          show: labelMode === 'always',
          fontSize: 11,
          color: '#0f172a',
          formatter: '{b}',
        },
        edgeSymbol: ['none', 'none'],
        data: filtered.nodes.map((node) => {
          const selected = node.id === selectedNodeId;
          const adjacent = neighborIds.has(node.id);
          const dimmed = selectedNodeId && !selected && !adjacent;
          const sizeMetric = nodeSizeBy === 'pagerank' ? Math.max(1, node.pagerank * 100) : node.value;
          return {
            id: node.id,
            name: node.name,
            value: node.value,
            degree: node.degree,
            pagerank: node.pagerank,
            community_id: node.community_id,
            category: communities.indexOf(node.community_id),
            symbolSize: Math.max(16, Math.min(64, Math.sqrt(sizeMetric) * 7)),
            label: { show: labelMode === 'always' || (labelMode === 'selected' && (selected || adjacent)) },
            itemStyle: { opacity: dimmed ? 0.18 : 1, borderWidth: selected ? 4 : adjacent ? 2 : 0, borderColor: selected ? '#0f172a' : '#14b8a6' },
          };
        }),
        links: filtered.edges.map((edge) => {
          const adjacent = edge.source === selectedNodeId || edge.target === selectedNodeId;
          const dimmed = selectedNodeId && !adjacent;
          return {
            source: edge.source,
            target: edge.target,
            value: edge.value,
            pmi: edge.pmi,
            lineStyle: {
              width: Math.max(1, Math.min(9, edge.value / 2)),
              opacity: dimmed ? 0.08 : adjacent ? 0.9 : 0.36,
              curveness: 0.08,
            },
          };
        }),
        emphasis: { focus: 'adjacency', label: { show: true } },
      }],
    };
  }, [communities, edgeLength, filtered.edges, filtered.nodes, labelMode, layout, neighborEdges, nodeSizeBy, repulsion, selectedNodeId]);

  const body = (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h3 className="font-semibold">{t('textMining.networkWorkbench')}</h3>
          <p className="text-sm text-slate-500">{t('textMining.networkWorkbenchHint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm" onClick={() => { setSelectedNodeId(''); setMinWeight(1); setNodeLimit(80); setSelectedCommunity('all'); }}>
            <RotateCcw size={15} />{t('common.resetFilters')}
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => setFullscreen(true)}>
            <Expand size={15} />{t('textMining.fullscreen')}
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="grid content-start gap-4 rounded border bg-slate-50 p-3 text-sm">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-500">{t('textMining.edgeThreshold')}: {minWeight}</span>
            <input type="range" min="1" max="20" value={minWeight} onChange={(event) => setMinWeight(Number(event.target.value))} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-500">{t('textMining.nodeLimit')}: {nodeLimit}</span>
            <input type="range" min="20" max="160" step="10" value={nodeLimit} onChange={(event) => setNodeLimit(Number(event.target.value))} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-500">{t('textMining.repulsion')}: {repulsion}</span>
            <input type="range" min="80" max="800" step="20" value={repulsion} onChange={(event) => setRepulsion(Number(event.target.value))} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-500">{t('textMining.edgeLength')}: {edgeLength}</span>
            <input type="range" min="50" max="320" step="10" value={edgeLength} onChange={(event) => setEdgeLength(Number(event.target.value))} />
          </label>
          <div className="grid gap-2">
            <span className="text-xs font-medium text-slate-500">{t('textMining.layoutMode')}</span>
            <div className="grid grid-cols-2 gap-2">
              {(['force', 'circular'] as const).map((item) => <button key={item} type="button" className={`rounded border px-2 py-1 text-xs ${layout === item ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={() => setLayout(item)}>{item}</button>)}
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-xs font-medium text-slate-500">{t('textMining.labelMode')}</span>
            <div className="grid grid-cols-3 gap-2">
              {(['always', 'hover', 'selected'] as const).map((item) => <button key={item} type="button" className={`rounded border px-2 py-1 text-xs ${labelMode === item ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={() => setLabelMode(item)}>{t(`textMining.label.${item}`)}</button>)}
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-xs font-medium text-slate-500">{t('textMining.nodeSizeBy')}</span>
            <div className="grid grid-cols-2 gap-2">
              {(['value', 'pagerank'] as const).map((item) => <button key={item} type="button" className={`rounded border px-2 py-1 text-xs ${nodeSizeBy === item ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={() => setNodeSizeBy(item)}>{item}</button>)}
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-xs font-medium text-slate-500">{t('textMining.communityFilter')}</span>
            <div className="flex flex-wrap gap-1">
              <button type="button" className={`rounded border px-2 py-1 text-xs ${selectedCommunity === 'all' ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={() => setSelectedCommunity('all')}>All</button>
              {communities.map((id) => <button key={id} type="button" className={`rounded border px-2 py-1 text-xs ${selectedCommunity === id ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={() => setSelectedCommunity(id)}>C{id}</button>)}
            </div>
          </div>
        </aside>
        <main className="min-h-[560px] rounded border bg-slate-950/95 p-2">
          <ReactECharts
            style={{ height: fullscreen ? 'calc(100vh - 96px)' : 720, width: '100%' }}
            option={option}
            onEvents={{ click: (params: { dataType?: string; data?: { id?: string } }) => {
              if (params.dataType === 'node' && params.data?.id) setSelectedNodeId(params.data.id);
            } }}
          />
        </main>
        <aside className="grid content-start gap-3 rounded border bg-slate-50 p-3 text-sm">
          <h4 className="font-semibold">{t('textMining.nodeDetails')}</h4>
          {selectedNode ? (
            <>
              <div className="rounded bg-white p-3">
                <p className="text-lg font-semibold">{selectedNode.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span>Count: {selectedNode.value}</span>
                  <span>Docs: {termById.get(selectedNode.id)?.doc_count ?? '-'}</span>
                  <span>Degree: {selectedNode.degree}</span>
                  <span>Weighted: {selectedNode.weighted_degree.toFixed(1)}</span>
                  <span>PageRank: {selectedNode.pagerank.toFixed(3)}</span>
                  <span>C{selectedNode.community_id}</span>
                </div>
              </div>
              <DetailList title={t('textMining.neighbors')} rows={neighborEdges.map((edge) => `${edge.source === selectedNodeId ? edge.target : edge.source} · w=${edge.value} · PMI=${edge.pmi.toFixed(2)}`)} />
              <DetailList title={t('textMining.relatedCollocations')} rows={relatedCollocations.map((row) => `${row.phrase} · ${row.score.toFixed(2)}`)} />
              <DetailList title={t('textMining.relatedRules')} rows={relatedRules.map((rule) => `${rule.antecedent.join(', ')} -> ${rule.consequent.join(', ')} · lift=${rule.lift.toFixed(2)}`)} />
            </>
          ) : (
            <p className="rounded bg-white p-3 text-slate-500">{t('textMining.selectNodeHint')}</p>
          )}
        </aside>
      </div>
      {fullscreen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 p-5">
          <div className="mb-3 flex justify-end">
            <button type="button" className="rounded bg-white px-4 py-2 text-sm" onClick={() => setFullscreen(false)}>{t('common.close', 'Close')}</button>
          </div>
          <ReactECharts style={{ height: 'calc(100vh - 84px)', width: '100%' }} option={option} onEvents={{ click: (params: { dataType?: string; data?: { id?: string } }) => {
            if (params.dataType === 'node' && params.data?.id) setSelectedNodeId(params.data.id);
          } }} />
        </div>
      )}
    </section>
  );
  return body;
}

function DetailList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="rounded bg-white p-3">
      <p className="font-medium">{title}</p>
      <div className="mt-2 grid gap-1 text-xs text-slate-600">
        {rows.length ? rows.map((row) => <span key={row}>{row}</span>) : <span>-</span>}
      </div>
    </div>
  );
}

export function CooccurrenceHeatmap({ data }: { data?: TextCooccurrence }) {
  const { t } = useTranslation();
  const terms = Array.from(new Set((data?.edges ?? []).flatMap((edge) => [edge.source, edge.target]))).slice(0, 30);
  const values = (data?.edges ?? [])
    .filter((edge) => terms.includes(edge.source) && terms.includes(edge.target))
    .flatMap((edge) => [
      [terms.indexOf(edge.source), terms.indexOf(edge.target), edge.weight],
      [terms.indexOf(edge.target), terms.indexOf(edge.source), edge.weight],
    ]);
  return frame(t('textMining.cooccurrenceHeatmap'), (
    <ReactECharts
      style={{ height: 460 }}
      option={{
        tooltip: { position: 'top' },
        grid: { left: 96, right: 24, top: 24, bottom: 110 },
        xAxis: { type: 'category', data: terms, axisLabel: { rotate: 60 } },
        yAxis: { type: 'category', data: terms },
        visualMap: { min: 0, max: Math.max(1, ...values.map((item) => Number(item[2]))), orient: 'horizontal', left: 'center', bottom: 0 },
        series: [{ type: 'heatmap', data: values }],
      }}
    />
  ));
}

export function TextMiningSankeyChart({ data }: { data?: TextSankey }) {
  const { t } = useTranslation();
  return frame(t('textMining.sankeyFlow'), (
    <ReactECharts
      style={{ height: 520 }}
      option={{
        tooltip: { trigger: 'item', triggerOn: 'mousemove' },
        series: [{
          type: 'sankey',
          emphasis: { focus: 'adjacency' },
          nodeAlign: 'justify',
          data: data?.nodes ?? [],
          links: data?.links ?? [],
          lineStyle: { color: 'gradient', curveness: 0.5 },
        }],
      }}
    />
  ));
}

export function CollocationBarChart({ data }: { data?: TextCollocations }) {
  const { t } = useTranslation();
  const rows = (data?.collocations ?? []).slice(0, 20).reverse();
  return frame(t('textMining.collocations'), (
    <ReactECharts
      style={{ height: 480 }}
      option={{
        tooltip: { trigger: 'axis' },
        grid: { left: 150, right: 24, top: 24, bottom: 32 },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: rows.map((row) => row.phrase) },
        series: [{ type: 'bar', data: rows.map((row) => Number(row.score.toFixed(3))), itemStyle: { color: '#0f766e' } }],
      }}
    />
  ));
}

export function AssociationRuleTable({ data }: { data?: TextAssociationRules }) {
  const { t } = useTranslation();
  return frame(t('textMining.associationRules'), (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">{t('textMining.antecedent')}</th>
            <th className="px-3 py-2">{t('textMining.consequent')}</th>
            <th className="px-3 py-2">Support</th>
            <th className="px-3 py-2">Confidence</th>
            <th className="px-3 py-2">Lift</th>
          </tr>
        </thead>
        <tbody>
          {(data?.rules ?? []).slice(0, 40).map((rule, index) => (
            <tr key={`${rule.antecedent.join('-')}-${rule.consequent.join('-')}-${index}`} className="border-t">
              <td className="px-3 py-2">{rule.antecedent.join(', ')}</td>
              <td className="px-3 py-2">{rule.consequent.join(', ')}</td>
              <td className="px-3 py-2">{rule.support.toFixed(3)}</td>
              <td className="px-3 py-2">{rule.confidence.toFixed(3)}</td>
              <td className="px-3 py-2 font-semibold text-teal-700">{rule.lift.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ));
}
