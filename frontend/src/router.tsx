import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { BadCaseViewerPage } from './pages/BadCaseViewerPage';
import { CorpusPage } from './pages/CorpusPage';
import { EvaluationAnalyticsPage } from './pages/EvaluationAnalyticsPage';
import { ExperimentRunsPage } from './pages/ExperimentRunsPage';
import { ExperimentWorkflowPage } from './pages/ExperimentWorkflowPage';
import { MetricGlossaryPage } from './pages/MetricGlossaryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';
import { QueryEvaluatorPage } from './pages/QueryEvaluatorPage';
import { RagCitationCheckerPage } from './pages/RagCitationCheckerPage';
import { RetrievalComparisonPage } from './pages/RetrievalComparisonPage';
import { LlmEvaluationPage } from './pages/LlmEvaluationPage';
import { TextMiningPage } from './pages/TextMiningPage';
import { PipelineJourneyPage } from './pages/PipelineJourneyPage';

const basePath = import.meta.env.VITE_BASE_PATH?.replace(/\/$/, '');

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'journey', element: <PipelineJourneyPage /> },
      { path: 'corpus', element: <CorpusPage /> },
      { path: 'query-evaluator', element: <QueryEvaluatorPage /> },
      { path: 'experiment-workflow', element: <ExperimentWorkflowPage /> },
      { path: 'retrieval-comparison', element: <RetrievalComparisonPage /> },
      { path: 'analytics', element: <EvaluationAnalyticsPage /> },
      { path: 'text-mining', element: <TextMiningPage /> },
      { path: 'llm-evaluation', element: <LlmEvaluationPage /> },
      { path: 'rag-citation-checker', element: <RagCitationCheckerPage /> },
      { path: 'bad-cases', element: <BadCaseViewerPage /> },
      { path: 'experiment-runs', element: <ExperimentRunsPage /> },
      { path: 'metric-glossary', element: <MetricGlossaryPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], basePath ? { basename: basePath } : undefined);
