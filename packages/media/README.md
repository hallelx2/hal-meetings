# @hal/media

Pluggable speech-to-text, LLM, and text-to-speech adapters for Hal. One interface per modality; swap providers via env config without touching call sites.

## Providers

| Modality | Provider | Status |
|---|---|---|
| **STT** | `whisper-local` (whisper.cpp subprocess) | ✅ |
| | `deepgram` (WSS streaming, diarized) | ✅ |
| **LLM** | `ollama` (local) | ✅ |
| | `anthropic` (Claude) | ✅ |
| **TTS** | `piper` (local) | ✅ |
| | `elevenlabs` | ✅ |

Each provider implements the interface defined in `src/<modality>/types.ts`. Adding new providers means writing one file and updating the factory.

## Use

```ts
import {
  createSttFromEnv,
  createLlmFromEnv,
  summarizeTranscript,
  transcriptToMarkdown,
} from '@hal/media';

const stt = createSttFromEnv();           // picks per STT_PROVIDER env
const llm = createLlmFromEnv();           // picks per LLM_PROVIDER env

const session = await stt.startStream({ sampleRate: 16000, diarize: true });
session.on((event) => {
  if (event.kind === 'final') console.log(event.line.text);
});

// pipe PCM frames in...
// session.write(pcmChunk);

const transcript = await session.end();
const summary = await summarizeTranscript(llm, transcript);
```

## Transcript model

Every provider normalizes its output to the same `Transcript` shape (`src/transcript.ts`). Use `transcriptToMarkdown()` to render for email, `transcriptToPromptForm()` for LLM input.

## Summary contract

`summarizeTranscript()` produces a `MeetingSummary` with overview, decisions, action items, open questions, attendees, and risks — validated against the schema, never auto-sent. The prompt explicitly tells the model not to invent decisions and not to summarize Hal's own utterances as commitments.
