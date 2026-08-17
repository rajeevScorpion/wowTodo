import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';

/**
 * Audio session helpers.
 *
 * Recording itself lives in `useVoiceRecording` — expo-audio exposes the
 * recorder only as a hook (`useAudioRecorder`), so it cannot be driven from
 * module-level imperative functions the way expo-av was. Everything that does
 * not need the recorder instance stays here.
 */

export async function requestMicrophonePermission(): Promise<boolean> {
    const { granted } = await requestRecordingPermissionsAsync();
    return granted;
}

/** Put the audio session into recording mode. */
export async function beginAudioSession(): Promise<void> {
    await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
    });
}

/** Release the recording audio session so normal playback resumes. */
export async function endAudioSession(): Promise<void> {
    await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
    });
}
