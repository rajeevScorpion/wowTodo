import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { RecordingPresets, useAudioRecorder } from 'expo-audio';
import { transcribeVoice } from '../services/ai';
import {
    beginAudioSession,
    endAudioSession,
    requestMicrophonePermission,
} from '../services/voice';
import { RecordingState, AppLanguage } from '../types';

/**
 * Single source of truth for voice capture.
 *
 * Migrated from expo-av (deprecated, warns at runtime and is slated for
 * removal) to expo-audio. Because expo-audio exposes the recorder as a hook,
 * this is now the only place recording can live — `CreateTaskInput` and the
 * branch screen previously each carried their own near-identical copy of this
 * logic and now share it.
 */

/**
 * Safety cap. Whisper rejects uploads over 25 MB; HIGH_QUALITY m4a runs roughly
 * 1 MB/minute, so a forgotten recording would previously fail late with a raw
 * API error. Stop well short of that.
 */
const MAX_RECORDING_MS = 10 * 60 * 1000;

export function useVoiceRecording(language: AppLanguage = 'en') {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearAutoStop = useCallback(() => {
        if (autoStopRef.current) {
            clearTimeout(autoStopRef.current);
            autoStopRef.current = null;
        }
    }, []);

    // Never leave the audio session held open if the screen unmounts mid-record.
    //
    // Deliberately does NOT touch `recorder`: useAudioRecorder releases the
    // underlying native shared object during unmount, and reading any property
    // on it afterwards throws "Cannot use shared object that was already
    // released". Releasing the recorder is expo-audio's job; releasing the
    // audio session is ours.
    useEffect(() => {
        return () => {
            clearAutoStop();
            endAudioSession().catch(() => {});
        };
    }, [clearAutoStop]);

    const startVoiceRecording = useCallback(async (): Promise<boolean> => {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            Alert.alert('Permission Required', 'Microphone permission is needed to record audio.');
            return false;
        }

        try {
            await beginAudioSession();
            await recorder.prepareToRecordAsync();
            recorder.record();
            setRecordingState('recording');

            autoStopRef.current = setTimeout(() => {
                Alert.alert(
                    'Recording stopped',
                    'Recordings are limited to 10 minutes. Processing what was captured.',
                );
                // Fire and forget — stopVoiceRecording handles its own state.
                void stopVoiceRecording();
            }, MAX_RECORDING_MS);

            return true;
        } catch (error: any) {
            await endAudioSession().catch(() => {});
            setRecordingState('idle');
            Alert.alert('Recording Error', error?.message ?? 'Could not start recording.');
            return false;
        }
        // stopVoiceRecording is stable enough for the auto-stop timer; excluded
        // deliberately to avoid a circular dependency between the callbacks.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recorder]);

    const stopVoiceRecording = useCallback(async (): Promise<string | null> => {
        clearAutoStop();
        setRecordingState('processing');

        try {
            await recorder.stop();
            const uri = recorder.uri;
            await endAudioSession();

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
            await endAudioSession().catch(() => {});
            setRecordingState('idle');
            Alert.alert('Transcription Error', error?.message ?? 'Could not transcribe the recording.');
            return null;
        }
    }, [recorder, language, clearAutoStop]);

    const cancelRecording = useCallback(async () => {
        clearAutoStop();
        try {
            if (recorder.isRecording) {
                await recorder.stop();
            }
        } catch {
            // Nothing usable to keep — discard silently.
        }
        await endAudioSession().catch(() => {});
        setRecordingState('idle');
    }, [recorder, clearAutoStop]);

    return { recordingState, startVoiceRecording, stopVoiceRecording, cancelRecording };
}
