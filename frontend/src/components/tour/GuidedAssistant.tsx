import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Bot, ChevronLeft, ChevronRight, Map, Play, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

interface TourStep {
  id: string;
  route: string;
  targetId: string;
  titleKey: string;
  bodyKey: string;
  actionKey: string;
}

const TOUR_STEPS: TourStep[] = [
  { id: 'overview', route: '/', targetId: 'overview-command-center', titleKey: 'tour.step.overview.title', bodyKey: 'tour.step.overview.body', actionKey: 'tour.step.overview.action' },
  { id: 'dataset', route: '/', targetId: 'dataset-selector', titleKey: 'tour.step.dataset.title', bodyKey: 'tour.step.dataset.body', actionKey: 'tour.step.dataset.action' },
  { id: 'journey', route: '/journey', targetId: 'journey-hero', titleKey: 'tour.step.journey.title', bodyKey: 'tour.step.journey.body', actionKey: 'tour.step.journey.action' },
  { id: 'upload', route: '/journey', targetId: 'journey-upload', titleKey: 'tour.step.upload.title', bodyKey: 'tour.step.upload.body', actionKey: 'tour.step.upload.action' },
  { id: 'corpus', route: '/corpus', targetId: 'corpus-quality', titleKey: 'tour.step.corpus.title', bodyKey: 'tour.step.corpus.body', actionKey: 'tour.step.corpus.action' },
  { id: 'workflow', route: '/experiment-workflow', targetId: 'workflow-config', titleKey: 'tour.step.workflow.title', bodyKey: 'tour.step.workflow.body', actionKey: 'tour.step.workflow.action' },
  { id: 'query', route: '/query-evaluator', targetId: 'query-evaluator-panel', titleKey: 'tour.step.query.title', bodyKey: 'tour.step.query.body', actionKey: 'tour.step.query.action' },
  { id: 'comparison', route: '/retrieval-comparison', targetId: 'retrieval-comparison-panel', titleKey: 'tour.step.comparison.title', bodyKey: 'tour.step.comparison.body', actionKey: 'tour.step.comparison.action' },
  { id: 'analytics', route: '/analytics', targetId: 'analytics-heatmaps', titleKey: 'tour.step.analytics.title', bodyKey: 'tour.step.analytics.body', actionKey: 'tour.step.analytics.action' },
  { id: 'diagnostics', route: '/analytics', targetId: 'analytics-diagnostics', titleKey: 'tour.step.diagnostics.title', bodyKey: 'tour.step.diagnostics.body', actionKey: 'tour.step.diagnostics.action' },
  { id: 'rag', route: '/rag-citation-checker', targetId: 'rag-workbench', titleKey: 'tour.step.rag.title', bodyKey: 'tour.step.rag.body', actionKey: 'tour.step.rag.action' },
  { id: 'badcases', route: '/bad-cases', targetId: 'badcases-panel', titleKey: 'tour.step.badcases.title', bodyKey: 'tour.step.badcases.body', actionKey: 'tour.step.badcases.action' },
  { id: 'llm', route: '/llm-evaluation', targetId: 'llm-dashboard', titleKey: 'tour.step.llm.title', bodyKey: 'tour.step.llm.body', actionKey: 'tour.step.llm.action' },
  { id: 'textmining', route: '/text-mining', targetId: 'text-mining-network', titleKey: 'tour.step.textmining.title', bodyKey: 'tour.step.textmining.body', actionKey: 'tour.step.textmining.action' },
  { id: 'report', route: '/experiment-runs', targetId: 'experiment-runs-panel', titleKey: 'tour.step.report.title', bodyKey: 'tour.step.report.body', actionKey: 'tour.step.report.action' },
];

interface TourContextValue {
  start: () => void;
  stop: () => void;
  active: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useGuidedTour() {
  const value = useContext(TourContext);
  if (!value) throw new Error('useGuidedTour must be used inside GuidedAssistantProvider');
  return value;
}

export function GuidedAssistantProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = TOUR_STEPS[stepIndex];

  useEffect(() => {
    if (!active || !step) return;
    if (location.pathname !== step.route) {
      navigate(step.route);
      return;
    }
    let tries = 0;
    const timer = window.setInterval(() => {
      const target = document.querySelector(`[data-tour-id="${step.targetId}"]`);
      tries += 1;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        window.setTimeout(() => setRect(target.getBoundingClientRect()), 260);
        window.clearInterval(timer);
      }
      if (tries > 20) {
        setRect(null);
        window.clearInterval(timer);
      }
    }, 120);
    return () => window.clearInterval(timer);
  }, [active, location.pathname, navigate, step]);

  useEffect(() => {
    if (!active || !step) return;
    const update = () => {
      const target = document.querySelector(`[data-tour-id="${step.targetId}"]`);
      setRect(target?.getBoundingClientRect() ?? null);
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, step]);

  const value = useMemo(() => ({
    active,
    start: () => { setStepIndex(0); setActive(true); },
    stop: () => setActive(false),
  }), [active]);
  const next = () => {
    if (stepIndex >= TOUR_STEPS.length - 1) setActive(false);
    else setStepIndex((current) => current + 1);
  };
  const prev = () => setStepIndex((current) => Math.max(0, current - 1));

  return (
    <TourContext.Provider value={value}>
      {children}
      <button
        type="button"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl"
        onClick={() => value.start()}
      >
        <Bot size={18} />{t('tour.floatingButton')}
      </button>
      {active && step && (
        <>
          <div className="pointer-events-none fixed inset-0 z-50 bg-slate-950/55" />
          {rect && (
            <div
              className="pointer-events-none fixed z-50 rounded-xl border-2 border-teal-300 shadow-[0_0_0_9999px_rgba(15,23,42,.55),0_0_34px_rgba(45,212,191,.9)] tour-pulse"
              style={{ left: Math.max(8, rect.left - 8), top: Math.max(8, rect.top - 8), width: rect.width + 16, height: rect.height + 16 }}
            />
          )}
          <div
            className="fixed z-50 w-[min(420px,calc(100vw-2rem))] rounded-2xl border bg-white p-4 shadow-2xl"
            style={{
              left: rect ? Math.max(16, Math.min(window.innerWidth - 440, Math.max(16, rect.left))) : 24,
              top: rect ? Math.max(16, Math.min(window.innerHeight - 260, Math.max(16, rect.bottom + 18))) : 96,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800">
                  <Map size={13} />{stepIndex + 1}/{TOUR_STEPS.length}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{t(step.titleKey)}</h3>
              </div>
              <button type="button" className="rounded border p-2" onClick={() => setActive(false)} aria-label={t('common.close')}><X size={16} /></button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t(step.bodyKey)}</p>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{t(step.actionKey)}</div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button type="button" className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm" onClick={prev} disabled={stepIndex === 0}><ChevronLeft size={15} />{t('tour.previous')}</button>
              <button type="button" className="rounded px-3 py-2 text-sm text-slate-500" onClick={() => setActive(false)}>{t('tour.skip')}</button>
              <button type="button" className="inline-flex items-center gap-1 rounded bg-slate-950 px-3 py-2 text-sm text-white" onClick={next}>{stepIndex >= TOUR_STEPS.length - 1 ? t('tour.finish') : t('tour.next')}<ChevronRight size={15} /></button>
            </div>
          </div>
        </>
      )}
    </TourContext.Provider>
  );
}
