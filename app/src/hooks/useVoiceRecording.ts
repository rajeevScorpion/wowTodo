import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { transcribeVoice } from '../services/ai';
import {
    requestMicrophonePermission,
    startRecording,
    stopRecording,
} from '../services/voice';
import { RecordingState, AppLanguage } from '../types';

export function useVoiceRecording(language: AppLanguage = 'en') {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');

    const startVoiceRecording = useCallback(async (): Promise<boolean> => {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            Alert.alert('Permission Required', 'Microphone permission is needed to record audio.');
            return false;
        }
        try {
            await startRecording();
            setRecordingState('recording');
            return true;
        } catch (error: any) {
            Alert.alert('Recording Error', error.message);
            return false;
        }
    }, []);

    const stopVoiceRecording = useCallback(async (): Promise<string | null> => {
        setRecordingState('processing');
        try {
            const uri = await stopRecording();
            if (!uri) {
                setRecordingState('idle');
                return null;
            }
            const transcript = await transcribeVoice(uri, language);
            setRecordingState('idle');
            if (!transcript.trim()) {
                Alert.alert('No speech detected', 'Please try recording again.');
                return null;
            }
            return transcript;
        } catch (error: any) {
            setRecordingState('idle');
            Alert.alert('Transcription Error', error.message);
            return null;
        }
    }, [language]);

    const cancelRecording = useCallback(async () => {
        try {
            await stopRecording();
        } catch {
            // ignore errors when cancelling
        }
        setRecordingState('idle');
    }, []);

    return { recordingState, startVoiceRecording, stopVoiceRecording, cancelRecording };
}
