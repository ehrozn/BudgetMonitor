import { Stack } from "expo-router";

export default function SettingsStackLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: "#F9FAFB",
                },
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="backup-restore" />
            <Stack.Screen name="app-preferences" />
        </Stack>
    );
}
