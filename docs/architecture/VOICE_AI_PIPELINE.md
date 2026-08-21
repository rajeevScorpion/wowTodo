# Voice and AI Pipeline — Current Implementation

**As implemented on 2026-08-17.** Planned agentic redesign is prompt 210 and must not
overwrite this document.

> **Since 2026-08-21 this is the FALLBACK path, not the only one.** Task generation now
> tries the router + specialist pipeline first — see
> [AGENTIC_INTENT_SYSTEM.md](AGENTIC_INTENT_SYSTEM.md), deployed with `AGENT_ROLLOUT=all`,
> so everything below now describes only what happens when that path **fails**.
> Transcription (steps 1-4) is **unchanged and shared** by both paths.
>
> Step 6 has also changed: the transcript-review step was removed in phase 2. Voice goes
> straight from step 5 to the result screen, with progressive status covering the wait.

## Flow

```
1. useVoiceRecording.startVoiceRecording()
      requestMicrophonePermission() → beginAudioSession() → recorder.record()
      expo-audio, RecordingPresets.HIGH_QUALITY → .m4a
      auto-stop at 10 min (Whisper rejects >25 MB; ~1 MB/min)

2. stopVoiceRecording()
      recorder.stop() → uri → endAudioSession()

3. transcribeVoice(uri, language)          services/ai/whisper.ts
      multipart: file, model=whisper-1, response_format=text, language
      → proxyFormData() → POST ai-proxy (Bearer user JWT)

4. ai-proxy (Deno Edge Function)
      verify JWT → allow-list model → attach OPENAI_API_KEY
      → OpenAI /v1/audio/transcriptions
      ← transcript text (passthrough, untouched)

5. generateTasks(transcript)               services/ai/index.ts
      → ai-proxy → gpt-4o-mini, JSON mode, prompt.ts
      on failure → gemini-2.0-flash (branchPrompt.ts for branches)
      ← { title, description, event_time, group, todos[] }

6. review.tsx → user confirms group → useCreateTaskWithTodos() → Postgres
      (the transcript-review step before this was removed in phase 2)
7. scheduleRemindersForTodos() → expo-notifications
```

## Deliberate design decisions

- **Whisper only.** No on-device or Android speech API. Verified absent: no
  `SpeechRecognizer`, `android.speech`, `expo-speech` or `@react-native-voice` anywhere.
  Owner requirement — Whisper is materially more accurate.
- **The proxy is a thin passthrough.** Prompt construction, response parsing and fallback
  logic stay on the client; the function exists solely to hold the API keys and
  allow-list models. Proven transparent: an identical WAV transcribed the same directly
  and through the proxy.
- **Fallback is failure-driven, not key-driven.** Gemini is tried when OpenAI *fails*,
  not when a key is absent (the client no longer knows about keys at all).

## Model allow-list

Enforced server-side in [ai-proxy/index.ts](../../app/supabase/functions/ai-proxy/index.ts);
validation runs **before** key lookup, so an invalid model can't probe key presence.

| Purpose | Allowed |
|---|---|
| Chat | `gpt-4o-mini` |
| Transcription | `whisper-1` |
| Gemini | `gemini-2.0-flash` |

## Verified behaviour

| Check | Result |
|---|---|
| Real OpenAI round trip through proxy | ✅ |
| Proxy transparency (control WAV, direct vs proxied) | ✅ identical transcript |
| Unauthenticated request | 401 |
| Disallowed model / malformed body / missing target | 400 |
| Missing server key | 503 |
| Wrong HTTP method | 405 |
| Voice → todos, end to end on emulator | ✅ confirmed by owner |

## Known gaps

| Gap | Impact | Defect |
|---|---|---|
| No timeout or cancellation | A stalled OpenAI call leaves the UI in `processing` forever with no way out but force-quit | **F4** |
| No rate limit or body-size cap | Any authenticated user can drain the OpenAI budget; Whisper accepts 25 MB | **F3** |
| No observability | Nothing records latency, token cost, fallback rate, prompt version or failure reason | blocks 160 |
| No idempotency | Network drop after AI returns but before insert loses the transcript and re-bills on retry | — |
| No evaluation dataset | Accuracy and planning quality cannot be regression-tested | prompt 160 |

## Environment note

The Android emulator needs **both** `-allow-host-audio` at launch **and** the Extended
Controls → Microphone → "Virtual microphone uses host audio input" toggle. The toggle
**resets on every emulator restart** and cannot be automated (`adb emu` has no microphone
command). A silent recording transcribes as empty and surfaces as "No speech detected" —
that is an input problem, not a code problem.
