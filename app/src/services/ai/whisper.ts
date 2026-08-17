const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

export async function transcribeAudio(
    audioUri: string,
    apiKey: string,
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

    const response = await fetch(WHISPER_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            // Do NOT set Content-Type — fetch sets it with the multipart boundary
        },
        body: formData,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Whisper API error (${response.status}): ${errorBody}`);
    }

    const transcription = await response.text();
    return transcription.trim();
}
