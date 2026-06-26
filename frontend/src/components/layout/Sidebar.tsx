import { NavLink } from 'react-router-dom';
import { BarChart3, BookOpen, BrainCircuit, Bug, FileSearch, FlaskConical, Gauge, Home, Map, Network, Quote, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const items = [
  ['/', 'navigation.overview', Home],
  ['/journey', 'navigation.journey', Map],
  ['/corpus', 'navigation.corpus', BookOpen],
  ['/query-evaluator', 'navigation.queryEvaluator', FileSearch],
  ['/experiment-workflow', 'workflow.title', Workflow],
  ['/retrieval-comparison', 'navigation.retrievalComparison', BarChart3],
  ['/analytics', 'navigation.analytics', BarChart3],
  ['/text-mining', 'navigation.textMining', Network],
  ['/llm-evaluation', 'navigation.llmEvaluation', BrainCircuit],
  ['/rag-citation-checker', 'navigation.ragCitationChecker', Quote],
  ['/bad-cases', 'navigation.badCases', Bug],
  ['/experiment-runs', 'navigation.experimentRuns', FlaskConical],
  ['/metric-glossary', 'navigation.metricGlossary', Gauge],
] as const;

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="w-full border-b bg-slate-950 p-3 text-white md:sticky md:top-0 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="mb-4 px-3 py-2">
        <div className="text-sm font-semibold">IR/RAG Lab</div>
        <div className="text-xs text-slate-400">Evaluation console</div>
      </div>
      <nav className="grid gap-1">
        {items.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded px-3 py-2 text-sm ${isActive ? 'bg-teal-500 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
            }
          >
            <Icon size={17} aria-hidden />
            {t(label)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
