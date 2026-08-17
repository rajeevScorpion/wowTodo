import { proxyFormData } from './proxy';

export async function transcribeAudio(
    audioUri: string,
    language: string = 'en',
): Promise<string> {
    const formData = new FormData();

    // expo-av records to a file URI; React Native's FormData accepts { uri, type, name }
    formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
    } as any);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    formData.append('language', language);

    // Routed through the ai-proxy Edge Function so the OpenAI key never ships
    // in the app bundle.
    const response = await proxyFormData(formData);

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Transcription failed (${response.status}): ${errorBody}`);
    }

    const transcription = await response.text();
    return transcription.trim();
}
