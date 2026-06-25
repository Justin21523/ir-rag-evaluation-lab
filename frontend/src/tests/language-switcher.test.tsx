import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
import { renderWithProviders } from './testUtils';

describe('LanguageSwitcher', () => {
  it('switches language and saves localStorage', () => {
    renderWithProviders(<LanguageSwitcher />);
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'en-US' } });
    expect(localStorage.getItem('ir-rag-locale')).toBe('en-US');
  });
});
