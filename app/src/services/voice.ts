import { Audio } from 'expo-av';

let currentRecording: Audio.Recording | null = null;

export async function requestMicrophonePermission(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
}

export async function startRecording(): Promise<void> {
    await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );

    currentRecording = recording;
}

export async function stopRecording(): Promise<string | null> {
    if (!currentRecording) return null;

    await currentRecording.stopAndUnloadAsync();

    await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
    });

    const uri = currentRecording.getURI();
    currentRecording = null;
    return uri;
}

export async function cancelRecording(): Promise<void> {
    if (!currentRecording) return;

    await currentRecording.stopAndUnloadAsync();

    await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
    });

    currentRecording = null;
}
