import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentsPage } from '../src/components/documents/documents-page'; 
import { useAuth } from '../src/context/auth-context';
import { MemoryRouter } from "react-router-dom";

// 1. Use vi.hoisted to define data that needs to be available inside mocks
const { mockDocs, mockSupabase } = vi.hoisted(() => {
  const docs = [
    { id: '1', name: 'Budget_2024.pdf', category: 'finance', size: '1.2 MB', uploaded_by: 'Yusuf', storage_path: 'path/1' },
    { id: '2', name: 'Meeting_Notes.docx', category: 'governance', size: '0.5 MB', uploaded_by: 'Yusuf', storage_path: 'path/2' }
  ];

  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb({ data: docs, error: null })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://test.com' } })),
      })),
    },
  };

  return { mockDocs: docs, mockSupabase: supabase };
});

// 2. Mock Auth
vi.mock('../src/context/auth-context', () => ({
  useAuth: vi.fn(),
}));

// 3. Mock Supabase using the hoisted variable
vi.mock('../src/lib/supabase', () => ({
  supabaseUntyped: mockSupabase,
}));

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Providing mock return value for the Auth context used in DocumentsPage
    (useAuth as any).mockReturnValue({
      user: { user_metadata: { full_name: 'Test User', organization_id: 'org-123' } },
    });
  });

  it('renders and displays the mocked documents', async () => {
  render(
    <MemoryRouter>
      <DocumentsPage />
    </MemoryRouter>
  );
  
  
  const title = await screen.findByText(/Resource Vault/i);
  expect(title).toBeDefined();

  const docTitle = await screen.findByText('Budget_2024.pdf');
  expect(docTitle).toBeDefined();
  expect(screen.getByText('Meeting_Notes.docx')).toBeDefined();
});

  it('shows the correct size badge for documents', async () => {
    render(
      <MemoryRouter>
        <DocumentsPage />
      </MemoryRouter>
    );
    
    const sizeBadge = await screen.findByText('1.2 MB');
    expect(sizeBadge).toBeDefined();
  });
});