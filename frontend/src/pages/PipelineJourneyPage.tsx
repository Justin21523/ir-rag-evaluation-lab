import { useMemo, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BarChart3, BrainCircuit, CheckCircle2, Database, FileJson, FileUp, FlaskConical, GitBranch, Network, Quote, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCorpusUpload } from '../hooks/useCorpusUpload';
import { useDatasetSelection } from '../hooks/useDatasetSelection';

const stages = [
  { id: 'raw', icon: FileJson, route: '/corpus' },
  { id: 'clean', icon: ShieldCheck, route: '/corpus' },
  { id: 'index', icon: Database, route: '/experiment-workflow' },
  { id: 'retrieve', icon: Search, route: '/query-evaluator' },
  { id: 'metrics', icon: BarChart3, route: '/analytics' },
  { id: 'compare', icon: GitBranch, route: '/retrieval-comparison' },
  { id: 'badcases', icon: FlaskConical, route: '/bad-cases' },
  { id: 'rag', icon: Quote, route: '/rag-citation-checker' },
  { id: 'textmining', icon: Network, route: '/text-mining' },
  { id: 'llm', icon: BrainCircuit, route: '/llm-evaluation' },
] as const;

function safeDatasetId(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized || `custom_${Date.now()}`;
}

export function PipelineJourneyPage() {
  const { t } = useTranslation();
  const { datasetId } = useDatasetSelection();
  const upload = useCorpusUpload();
  const [activeStage, setActiveStage] = useState<(typeof stages)[number]['id']>('raw');
  const [name, setName] = useState('Interview Demo Corpus');
  const [documentsFile, setDocumentsFile] = useState<File | null>(null);
  const [queriesFile, setQueriesFile] = useState<File | null>(null);
  const [datasetSlug, setDatasetSlug] = useState(`custom_demo_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
  const activeIndex = stages.findIndex((stage) => stage.id === activeStage);
  const canUpload = documentsFile && queriesFile && datasetSlug.trim();
  const effectCards = useMemo(() => ['effectA', 'effectB', 'effectC'], []);

  const onFile = (setter: (file: File | null) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(event.target.files?.[0] ?? null);
  };

  const submitUpload = () => {
    if (!documentsFile || !queriesFile) return;
    upload.mutate({
      dataset_id: safeDatasetId(datasetSlug),
      name,
      documents_file: documentsFile,
      queries_file: queriesFile,
    });
  };

  return (
    <div className="grid gap-6">
      <section data-tour-id="journey-hero" className="overflow-hidden rounded-xl border bg-slate-950 p-5 text-white shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-sm text-teal-300">{t('journey.eyebrow')}</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-semibold">{t('journey.title')}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{t('journey.subtitle')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="rounded bg-teal-500 px-4 py-2 text-sm font-medium text-white" to="/experiment-workflow">{t('journey.startExperiment')}</Link>
              <Link className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-100" to="/analytics">{t('journey.openAnalytics')}</Link>
            </div>
          </div>
          <div className="journey-visual relative min-h-64 rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="journey-particles" aria-hidden>
              {Array.from({ length: 18 }).map((_, index) => <span key={index} style={{ '--i': index } as CSSProperties} />)}
            </div>
            <div className="relative z-10 grid gap-3">
              {stages.slice(0, 5).map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <div key={stage.id} className={`journey-flow-row ${index <= activeIndex ? 'is-active' : ''}`}>
                    <Icon size={18} />
                    <span>{t(`journey.stage.${stage.id}.title`)}</span>
                    <ArrowRight size={15} className="ml-auto" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div data-tour-id="journey-upload" className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <FileUp className="text-teal-700" size={20} />
            <h3 className="font-semibold">{t('journey.upload.title')}</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t('journey.upload.help')}</p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              {t('journey.upload.datasetName')}
              <input className="rounded border px-3 py-2" value={name} onChange={(event) => { setName(event.target.value); setDatasetSlug(safeDatasetId(event.target.value)); }} />
            </label>
            <label className="grid gap-1 text-sm">
              Dataset ID
              <input className="rounded border px-3 py-2 font-mono" value={datasetSlug} onChange={(event) => setDatasetSlug(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">
              documents.jsonl
              <input className="rounded border px-3 py-2" type="file" accept=".jsonl,application/jsonl" onChange={onFile(setDocumentsFile)} />
            </label>
            <label className="grid gap-1 text-sm">
              queries.jsonl
              <input className="rounded border px-3 py-2" type="file" accept=".jsonl,application/jsonl" onChange={onFile(setQueriesFile)} />
            </label>
            <button type="button" className="inline-flex w-fit items-center gap-2 rounded bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={!canUpload || upload.isPending} onClick={submitUpload}>
              <FileUp size={16} />{upload.isPending ? t('common.loading') : t('journey.upload.action')}
            </button>
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              {documentsFile || queriesFile ? (
                <div className="grid gap-1">
                  <span>{documentsFile?.name ?? 'documents.jsonl'} · {queriesFile?.name ?? 'queries.jsonl'}</span>
                  <span>{t('journey.upload.currentDataset')}: <strong>{datasetId}</strong></span>
                </div>
              ) : t('journey.upload.sampleFallback')}
            </div>
            {upload.data && (
              <div className="grid gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">
                <div className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} />{t('journey.upload.completed')}</div>
                <div>{upload.data.dataset_id} · {upload.data.document_count} docs · {upload.data.query_count} queries · {upload.data.qrels_count} qrels</div>
              </div>
            )}
            {upload.isError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{t('common.error')}</div>}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">{t('journey.tabs.title')}</h3>
              <p className="text-sm text-slate-500">{t('journey.tabs.help')}</p>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-mono">{activeIndex + 1}/{stages.length}</span>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <button
                  key={stage.id}
                  type="button"
                  className={`journey-tab ${stage.id === activeStage ? 'is-active' : ''} ${index < activeIndex ? 'is-done' : ''}`}
                  onClick={() => setActiveStage(stage.id)}
                >
                  <Icon size={16} />
                  <span>{t(`journey.stage.${stage.id}.short`)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_240px]">
            <div className="rounded-lg border bg-slate-50 p-4">
              <h4 className="text-lg font-semibold">{t(`journey.stage.${activeStage}.title`)}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t(`journey.stage.${activeStage}.meaning`)}</p>
              <div className="mt-4 grid gap-2">
                {effectCards.map((effect) => (
                  <div key={effect} className="journey-effect-card">
                    <Sparkles size={15} />
                    <span>{t(`journey.stage.${activeStage}.${effect}`)}</span>
                  </div>
                ))}
              </div>
              <Link className="mt-4 inline-flex items-center gap-2 rounded border bg-white px-3 py-2 text-sm" to={stages[activeIndex]?.route ?? '/analytics'}>
                {t('journey.openStep')}<ArrowRight size={15} />
              </Link>
            </div>
            <div className="journey-stage-theater">
              <div className="journey-stage-node is-source">JSONL</div>
              <div className="journey-stage-line" />
              <div className="journey-stage-node is-active">{t(`journey.stage.${activeStage}.short`)}</div>
              <div className="journey-stage-line" />
              <div className="journey-stage-node is-result">{t('journey.result')}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
