// src/lib/chatProvider.ts
// One interface for AI character replies. Swap MockProvider for a real one in the last line only.
export type ChatMessage = { role: 'user' | 'character'; text: string }
export interface ChatProvider {
  sendMessage(characterId: string, history: ChatMessage[]): AsyncGenerator<string>
}

const canned = [
  'Thanks for the message. This is a demo reply, so the wording is canned.',
  'Tell me more about your day. A real model would answer in character here.',
  'Good question. Once a model is connected, the reply will follow my personality settings.',
  'I am an AI character. This line shows how streamed text appears word by word.',
]

export const MockProvider: ChatProvider = {
  async *sendMessage(_characterId, history) {
    const words = canned[history.length % canned.length].split(' ')
    for (const word of words) {
      await new Promise((r) => setTimeout(r, 60))
      yield word + ' '
    }
  },
}

// To use a local model: write a provider that POSTs { characterId, history } to its URL,
// for example http://localhost:11434/api/chat, and yields the streamed text chunks.
export const chatProvider: ChatProvider = MockProvider

// Characters must be fictional. This short list stands in for a maintained name-screening service.
const realNames = ['taylor swift', 'elon musk', 'emma watson', 'barack obama', 'donald trump', 'kim kardashian', 'cristiano ronaldo', 'scarlett johansson']
export const isRealPerson = (name: string) => realNames.some((n) => name.trim().toLowerCase().includes(n))
