import { vi } from 'vitest'

// Mock the entire GoogleGenerativeAI library
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => "This is a mocked AI response for testing."
          }
        })
      })
    }))
  }
})