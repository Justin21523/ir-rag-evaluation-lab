import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LlmEvaluationPage } from '../pages/LlmEvaluationPage';
import { renderWithProviders } from './testUtils';

vi.mock('../hooks/useLlm', () => ({
  useLlmStatus: () => ({
    data: {
      provider: 'llama_cpp_server',
      connected: false,
      status: 'disconnected',
      base_url: 'http://localhost:8080/v1',
      model: 'local-model',
      assistive_signal: true,
    },
  }),
  useLlmDashboard: () => ({
    isPending: false,
    isError: false,
    data: {
      dataset_id: 'sample_default',
      total_runs: 3,
      success_rate: 0.67,
      invalid_json_rate: 0,
      average_latency_ms: 120,
      average_confidence: 0.5,
      claim_judgment_distribution: { supported: 2, unsupported: 1 },
      root_cause_distribution: { semantic_drift: 1 },
      confidence_histogram: [{ bucket: '0.5-0.6', count: 2 }],
      latency_over_time: [{ created_at: '2026-01-01', prompt_type: 'rag_faithfulness', latency_ms: 120 }],
      slowest_prompts: [{ run_id: 'llm_run_1', prompt_type: 'rag_faithfulness', latency_ms: 120, status: 'ok' }],
      recent_runs: [{
        run_id: 'llm_run_1',
        dataset_id: 'sample_default',
        prompt_type: 'rag_faithfulness',
        provider: 'llama_cpp_server',
        model: 'local-model',
        status: 'ok',
        latency_ms: 120,
        confidence: 0.5,
        input_summary: 'claim review',
        output_summary: 'supported',
        request: {},
        response: {},
        error: {},
        created_at: '2026-01-01',
      }],
      rewrite_improvement: [{ rewrite_kind: 'semantic_paraphrase', recall_delta: 0.2, ndcg_delta: 0.1, rank_delta: 1, created_at: '2026-01-01' }],
    },
  }),
}));

describe('LlmEvaluationPage', () => {
  it('renders LLM dashboard metrics and run history', () => {
    renderWithProviders(<LlmEvaluationPage />);
    expect(screen.getByText('LLM 評估')).toBeInTheDocument();
    expect(screen.getByText('總執行數')).toBeInTheDocument();
    expect(screen.getByText('LLM 執行歷史')).toBeInTheDocument();
    expect(screen.getAllByText(/rag_faithfulness/).length).toBeGreaterThan(0);
  });
});
