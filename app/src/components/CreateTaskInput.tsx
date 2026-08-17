import { useState, useCallback } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { AppText } from './ui/AppText';
import { VoiceInput } from './VoiceInput';
import { Sparkles } from 'lucide-react-native';
import { useAuth } from '../providers/AuthProvider';
import { generateTask, transcribeVoice } from '../services/ai';
import { useCreateTaskWithTodos } from '../features/tasks/api';
import { reminderKeys } from '../features/reminders/api';
import { scheduleRemindersForTodos } from '../services/reminders/scheduler';
import { getCachedReminderSettings } from '../services/reminders/settingsCache';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { RecordingState, AppLanguage, ReminderSettings } from '../types';
import { useSemanticColors } from '../design-system/useSemanticColors';

export function CreateTaskInput() {
    const { user } = useAuth();
    const createTask = useCreateTaskWithTodos();
    const queryClient = useQueryClient();
    const colors = useSemanticColors();

    const [inputText, setInputText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [language, setLanguage] = useState<AppLanguage>('en');

    // Recording, permissions, the audio session and transcription all live in
    // the shared hook — this component used to duplicate that logic.
    const { recordingState, startVoiceRecording, stopVoiceRecording } =
        useVoiceRecording(language);

    const handleSubmit = useCallback(
        async (text: string, sourceType: 'text' | 'voice') => {
            if (!text.trim() || !user) return;
            setIsGenerating(true);
            try {
                const aiResult = await generateTask(text.trim(), undefined, language);
                const result = await createTask.mutateAsync({
                    task: {
                        user_id: user.id,
                        title: aiResult.title,
                        description: aiResult.description,
                        source_text: text.trim(),
                        source_type: sourceType,
                    },
                    todos: aiResult.todos,
                });

                // Auto-schedule reminders for todos with due dates
                const todosWithDates = result.todos.filter(t => t.due_date);
                if (todosWithDates.length > 0) {
                    let reminderSettings =
                        queryClient.getQueryData<ReminderSettings[]>(reminderKeys.settings) ?? null;
                    if (!reminderSettings && user) {
                        reminderSettings = await getCachedReminderSettings(user.id);
                    }
                    if (reminderSettings?.length) {
                        scheduleRemindersForTodos(todosWithDates, result.task, reminderSettings)
                            .catch(err => console.warn('Auto-scheduling reminders failed:', err));
                    }
                }

                setInputText('');
            } catch (error: any) {
                Alert.alert(
                    'Failed to create task',
                    error.message || 'Something went wrong. Please try again.',
                );
            } finally {
                setIsGenerating(false);
            }
        },
        [user, createTask, language],
    );

    const handleTextSubmit = () => handleSubmit(inputText, 'text');

    const handleStartRecording = async () => {
        await startVoiceRecording();
    };

    const handleStopRecording = async () => {
        const transcript = await stopVoiceRecording();
        if (!transcript) return;
        setInputText(transcript);
        await handleSubmit(transcript, 'voice');
    };

    const isDisabled = isGenerating || recordingState !== 'idle';

    return (
        <YStack gap="$2">
            <XStack gap="$2" alignItems="flex-end">
                <YStack flex={1}>
                    <Input
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Describe a task... e.g. 'Plan a birthday party'"
                        multiline
                        numberOfLines={2}
                        editable={!isDisabled}
                    />
                </YStack>
                <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setLanguage(prev => prev === 'en' ? 'hi' : 'en')}
                    disabled={isDisabled}
                    style={{ paddingHorizontal: 8, minWidth: 40 }}
                >
                    <AppText weight="medium" size="sm">
                        {language === 'en' ? 'EN' : 'हिं'}
                    </AppText>
                </Button>
                <VoiceInput
                    recordingState={recordingState}
                    onStartRecording={handleStartRecording}
                    onStopRecording={handleStopRecording}
                    language={language}
                />
            </XStack>

            <Button
                onPress={handleTextSubmit}
                disabled={!inputText.trim() || isDisabled}
                size="md"
                fullWidth
            >
                {isGenerating ? (
                    <XStack alignItems="center" gap="$2">
                        <ActivityIndicator color="white" size="small" />
                        <AppText weight="medium" color={'white'}>
                            AI is thinking...
                        </AppText>
                    </XStack>
                ) : (
                    <XStack alignItems="center" gap="$2">
                        <Sparkles size={18} color="white" />
                        <AppText weight="medium" color={'white'}>
                            Generate Tasks with AI
                        </AppText>
                    </XStack>
                )}
            </Button>
        </YStack>
    );
}
