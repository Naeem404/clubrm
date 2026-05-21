import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DocumentsPage } from '../../src/components/documents/documents-page';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.stubEnv('VITE_SUPABASE_URL', 'https://placeholder.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'placeholder-key');

const mockChain = vi.hoisted(() => ({
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  then: vi.fn((onFulfilled?: any) =>
    Promise.resolve(onFulfilled ? onFulfilled({ data: [], error: null }) : { data: [], error: null })
  ),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabaseUntyped: {
    from: vi.fn(() => mockChain),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com' } })),
      })),
    },
  },
}));

vi.mock('../../src/context/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', user_metadata: { full_name: 'User', organization_id: 'o1' } },
  }),
}));

describe('Documents Integration', () => {
  it('should execute a full upload cycle', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><DocumentsPage /></MemoryRouter>);

    // Open the upload dialog
    const uploadTrigger = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadTrigger);

    // Find the file input inside the dialog portal
    const input = await waitFor(() => {
      const el = document.querySelector('input[type="file"]');
      if (!el) throw new Error("File input not found");
      return el as HTMLInputElement;
    });

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    await user.upload(input, file);

    // ── FIX: the dialog's submit button renders as "Upload" (or similar),
    //    NOT "Initiate". Use a broad regex that matches whatever the actual
    //    submit button says, falling back to any button that isn't the
    //    trigger or close button.
    //
    //    Strategy: find ALL buttons visible after the dialog opens, then
    //    pick the one that is the submit action (not Close / Cancel).
    //    We use findAllByRole so we wait for the portal to settle.
    const allButtons = await screen.findAllByRole('button');

    // The submit button is the one that is NOT the close X, NOT "Cancel",
    // and NOT the original "Upload" trigger (which is now behind the overlay).
    // In practice the dialog submit is labelled "Upload" as well, so we pick
    // the last "Upload"-labelled button (the one inside the dialog).
    const submitCandidates = allButtons.filter((btn) => {
      const text = btn.textContent?.toLowerCase() ?? '';
      // Exclude the radix close button (contains only an X / sr-only text)
      // and any cancel button
      return (
        text.includes('upload') &&
        !text.includes('cancel') &&
        btn.getAttribute('data-slot') !== 'dialog-close'
      );
    });

    // The last match is the one inside the dialog portal
    const submitButton = submitCandidates[submitCandidates.length - 1];
    expect(submitButton).toBeTruthy();
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockChain.insert).toHaveBeenCalled();
    });
  });
});