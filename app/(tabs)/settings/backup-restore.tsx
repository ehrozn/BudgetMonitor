import { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    TextInput,
    Platform,
    Share,
    ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
    ChevronLeft,
    Cloud,
    Download,
    Upload,
    RefreshCw,
    Shield,
    Check,
    Copy,
} from "lucide-react-native";

// TODO: Missing modules - waiting for user input or placeholders
// import { useApp } from "../../../context/AppContext";
// import { hapticLight, hapticSuccess } from "../../../utils/haptics";

// TEMPORARY PLACEHOLDERS
const useApp = () => ({
    settings: { backupProvider: 'none', autoBackupEnabled: false, autoBackupFrequency: 'weekly' },
    updateSettings: () => { },
    backupMetadata: { lastBackupAt: null },
    exportData: async () => JSON.stringify({ data: 'backup' }),
    importData: async () => ({ success: true }),
});
const hapticLight = () => { };
const hapticSuccess = () => { };

const providerChips: { key: "none" | "google" | "icloud"; label: string }[] = [
    { key: "none", label: "Local only" },
    { key: "google", label: "Google Drive" },
    { key: "icloud", label: "iCloud Drive" },
];

const frequencyChips: { key: "daily" | "weekly" | "monthly"; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
];

const copyTextUsingExecCommand = (value: string): boolean => {
    if (typeof document === "undefined" || !document.body) {
        console.log("Backup export: execCommand fallback unavailable - no document context");
        return false;
    }

    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "true");
    textArea.style.position = "fixed";
    textArea.style.top = "-1000px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);

    let success = false;
    try {
        textArea.focus();
        textArea.select();
        success = document.execCommand("copy");
        console.log("Backup export: execCommand fallback result", success);
    } catch (error) {
        console.error("Backup export: execCommand fallback failed", error);
    } finally {
        document.body.removeChild(textArea);
    }

    return success;
};

export default function BackupRestoreScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const {
        settings,
        updateSettings,
        backupMetadata,
        exportData,
        importData,
    } = useApp();

    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [isImporting, setIsImporting] = useState<boolean>(false);
    const [restoreInput, setRestoreInput] = useState<string>("");
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [manualBackupPayload, setManualBackupPayload] = useState<string | null>(null);
    const [clipboardUnavailable, setClipboardUnavailable] = useState<boolean>(false);

    const handleBack = useCallback(() => {
        hapticLight();
        router.back();
    }, [router]);

    const handleProviderSelect = useCallback(
        (provider: "none" | "google" | "icloud") => {
            hapticLight();
            updateSettings({ backupProvider: provider });
        },
        [updateSettings]
    );

    const handleToggleAuto = useCallback(
        (value: boolean) => {
            hapticLight();
            updateSettings({ autoBackupEnabled: value });
        },
        [updateSettings]
    );

    const handleFrequencySelect = useCallback(
        (frequency: "daily" | "weekly" | "monthly") => {
            hapticLight();
            updateSettings({ autoBackupFrequency: frequency });
        },
        [updateSettings]
    );

    const handleExport = useCallback(async () => {
        console.log("Backup export: start");
        setIsExporting(true);
        setError(null);
        setFeedback(null);
        setManualBackupPayload(null);

        try {
            const payload = await exportData();
            console.log("Backup export: payload generated", { hasPayload: Boolean(payload) });
            if (!payload) {
                setError("Could not create a backup. Please try again.");
                return;
            }

            if (Platform.OS === "web") {
                console.log("Backup export: web flow -> download");
                try {
                    if (typeof document === "undefined") {
                        throw new Error("Document is unavailable");
                    }
                    const fileName = `budget-backup-${new Date().toISOString()}.json`;
                    const blob = new Blob([payload], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    setFeedback("Backup downloaded as JSON file. Store it securely.");
                    setManualBackupPayload(null);
                    hapticSuccess();
                } catch (downloadError) {
                    console.error("Backup export: download failed", downloadError);
                    setManualBackupPayload(payload);
                    setFeedback(null);
                    setError("Automatic download was blocked. Copy the backup below.");
                }
                return;
            }

            await Share.share({
                title: "Budget backup",
                message: payload,
            });
            setFeedback("Backup ready. Save or share it to keep it safe.");
            hapticSuccess();
        } catch (shareError) {
            console.error("Backup export error", shareError);
            setError("Unable to share backup. Try again or copy manually.");
        } finally {
            setIsExporting(false);
        }
    }, [exportData]);

    const handleImport = useCallback(async () => {
        if (!restoreInput.trim()) {
            setError("Paste your backup JSON before restoring.");
            return;
        }

        setIsImporting(true);
        setError(null);
        setFeedback(null);

        try {
            const result = await importData(restoreInput.trim());
            if (result.success) {
                setRestoreInput("");
                setFeedback("Backup restored successfully.");
                hapticSuccess();
            } else {
                setError(result.error ?? "Restore failed. Please check the backup file.");
            }
        } finally {
            setIsImporting(false);
        }
    }, [restoreInput, importData]);

    const handleManualCopy = useCallback(async () => {
        if (!manualBackupPayload) {
            return;
        }

        console.log("Backup export: manual copy requested");

        if (Platform.OS === "web") {
            const webNavigator = typeof window !== "undefined" ? window.navigator : undefined;
            const hasClipboardMethod = Boolean(webNavigator?.clipboard?.writeText);
            const canUseClipboardApi = !clipboardUnavailable && hasClipboardMethod;

            if (canUseClipboardApi && webNavigator?.clipboard?.writeText) {
                try {
                    await webNavigator.clipboard.writeText(manualBackupPayload);
                    console.log("Backup export: manual clipboard copy success");
                    setFeedback("Backup copied to clipboard. Paste it into a secure place.");
                    setManualBackupPayload(null);
                    hapticSuccess();
                    return;
                } catch (clipboardError) {
                    console.error("Backup export: manual copy failed", clipboardError);
                    setClipboardUnavailable(true);
                }
            } else if (!hasClipboardMethod && !clipboardUnavailable) {
                console.log("Backup export: navigator.clipboard unavailable, enabling fallback");
                setClipboardUnavailable(true);
            }

            const fallbackSuccess = copyTextUsingExecCommand(manualBackupPayload);
            if (fallbackSuccess) {
                setFeedback("Backup copied to clipboard. Paste it into a secure place.");
                setManualBackupPayload(null);
                hapticSuccess();
                return;
            }

            setFeedback("Copy failed. Select the text below and copy it manually.");
            return;
        }

        setFeedback("Tap and hold the backup text to copy on your device.");
    }, [
        manualBackupPayload,
        clipboardUnavailable,
        setClipboardUnavailable,
        setFeedback,
        setManualBackupPayload,
    ]);

    const lastBackupCopy = backupMetadata.lastBackupAt
        ? new Date(backupMetadata.lastBackupAt).toLocaleString()
        : "Never";

    return (
        <View style={styles.wrapper}>
            <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.backButton}
                    testID="backup-back"
                >
                    <ChevronLeft color="#111827" size={24} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Backup & Restore</Text>
                    <Text style={styles.headerSubtitle}>
                        Keep your data safe with local or cloud backups.
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.flex}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 56 }}
            >
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
                            <Cloud color="#16A34A" size={20} />
                        </View>
                        <Text style={styles.cardTitle}>Backup destination</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>
                        Choose where your backups should live. Cloud options require you to upload files manually.
                    </Text>
                    <View style={styles.chipRow}>
                        {providerChips.map((chip) => {
                            const isActive = settings.backupProvider === chip.key;
                            return (
                                <TouchableOpacity
                                    key={chip.key}
                                    style={[styles.chip, isActive && styles.chipActive]}
                                    onPress={() => handleProviderSelect(chip.key)}
                                    testID={`backup-provider-${chip.key}`}
                                >
                                    <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>{chip.label}</Text>
                                    {isActive ? <Check size={16} color="#fff" /> : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconCircle, { backgroundColor: "#E0EAFF" }]}>
                            <Shield color="#3730A3" size={20} />
                        </View>
                        <Text style={styles.cardTitle}>Auto backup</Text>
                    </View>
                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Enable automatic reminders</Text>
                        <Switch
                            value={settings.autoBackupEnabled}
                            onValueChange={handleToggleAuto}
                            trackColor={{ true: "#2563EB", false: "#CBD5F5" }}
                            thumbColor={settings.autoBackupEnabled ? "#FFFFFF" : "#F9FAFB"}
                            testID="backup-auto-toggle"
                        />
                    </View>
                    {settings.autoBackupEnabled ? (
                        <View style={styles.chipRow}>
                            {frequencyChips.map((chip) => {
                                const isActive = settings.autoBackupFrequency === chip.key;
                                return (
                                    <TouchableOpacity
                                        key={chip.key}
                                        style={[styles.chip, isActive && styles.chipActive]}
                                        onPress={() => handleFrequencySelect(chip.key)}
                                        testID={`backup-frequency-${chip.key}`}
                                    >
                                        <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>{chip.label}</Text>
                                        {isActive ? <Check size={16} color="#fff" /> : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : null}
                    <Text style={styles.metaInfo}>Last backup: {lastBackupCopy}</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconCircle, { backgroundColor: "#E0F2FE" }]}>
                            <Download color="#0369A1" size={20} />
                        </View>
                        <Text style={styles.cardTitle}>Create backup</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>
                        Save an encrypted JSON file. Store it in your preferred cloud drive or password manager.
                    </Text>
                    <TouchableOpacity
                        style={[styles.primaryButton, isExporting && styles.primaryButtonDisabled]}
                        onPress={handleExport}
                        disabled={isExporting}
                        testID="backup-export"
                    >
                        {isExporting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <View style={styles.buttonContent}>
                                <Upload color="#FFFFFF" size={20} />
                                <Text style={styles.primaryButtonText}>Export backup</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconCircle, { backgroundColor: "#FEF3C7" }]}>
                            <RefreshCw color="#B45309" size={20} />
                        </View>
                        <Text style={styles.cardTitle}>Restore from backup</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>
                        Paste your backup JSON here. We will replace all current data with the backup contents.
                    </Text>
                    <TextInput
                        style={styles.textArea}
                        value={restoreInput}
                        onChangeText={setRestoreInput}
                        placeholder="Paste backup JSON"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        textAlignVertical="top"
                        numberOfLines={6}
                        autoCorrect={false}
                        testID="backup-restore-input"
                    />
                    <TouchableOpacity
                        style={[styles.secondaryButton, isImporting && styles.secondaryButtonDisabled]}
                        onPress={handleImport}
                        disabled={isImporting}
                        testID="backup-restore"
                    >
                        {isImporting ? (
                            <ActivityIndicator color="#2563EB" />
                        ) : (
                            <Text style={styles.secondaryButtonText}>Restore backup</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {manualBackupPayload ? (
                    <View style={styles.manualCard} testID="backup-manual-card">
                        <Text style={styles.manualTitle}>Manual copy required</Text>
                        <Text style={styles.manualSubtitle}>
                            Automatic clipboard access was blocked. Copy the backup below and store it securely.
                        </Text>
                        <View style={styles.manualPayloadBox}>
                            <ScrollView
                                style={styles.manualScroll}
                                contentContainerStyle={styles.manualScrollContent}
                                persistentScrollbar
                            >
                                <Text selectable style={styles.manualPayloadText} testID="backup-manual-payload">
                                    {manualBackupPayload}
                                </Text>
                            </ScrollView>
                        </View>
                        <TouchableOpacity
                            style={styles.manualCopyButton}
                            onPress={handleManualCopy}
                            testID="backup-manual-copy"
                        >
                            <Copy color="#2563EB" size={18} />
                            <Text style={styles.manualCopyButtonText}>Copy backup</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {feedback ? (
                    <View style={styles.feedbackCard} testID="backup-feedback">
                        <Text style={styles.feedbackText}>{feedback}</Text>
                    </View>
                ) : null}

                {error ? (
                    <View style={styles.errorCard} testID="backup-error">
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    flex: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        gap: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#0F172A",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    headerTextContainer: {
        gap: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "700" as const,
        color: "#0F172A",
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#64748B",
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: "#0F172A",
        shadowOpacity: 0.04,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#111827",
    },
    cardSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 16,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    chipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: "#F1F5F9",
    },
    chipActive: {
        backgroundColor: "#2563EB",
    },
    chipLabel: {
        fontSize: 14,
        color: "#1F2937",
        fontWeight: "600" as const,
    },
    chipLabelActive: {
        color: "#FFFFFF",
    },
    toggleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    toggleLabel: {
        fontSize: 16,
        color: "#111827",
        fontWeight: "600" as const,
    },
    metaInfo: {
        marginTop: 8,
        fontSize: 13,
        color: "#6B7280",
    },
    primaryButton: {
        backgroundColor: "#2563EB",
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryButtonDisabled: {
        opacity: 0.6,
    },
    buttonContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFFFFF",
    },
    textArea: {
        minHeight: 140,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F9FAFB",
        padding: 16,
        fontSize: 14,
        color: "#111827",
        marginBottom: 16,
    },
    secondaryButton: {
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#2563EB",
        paddingVertical: 14,
        alignItems: "center",
    },
    secondaryButtonDisabled: {
        opacity: 0.6,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#2563EB",
    },
    manualCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: "#0F172A",
        shadowOpacity: 0.04,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
        gap: 12,
    },
    manualTitle: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#111827",
    },
    manualSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
    },
    manualPayloadBox: {
        maxHeight: 200,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
    },
    manualScroll: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    manualScrollContent: {
        flexGrow: 1,
    },
    manualPayloadText: {
        fontSize: 13,
        color: "#111827",
        lineHeight: 18,
    },
    manualCopyButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#2563EB",
        paddingVertical: 14,
    },
    manualCopyButtonText: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#2563EB",
    },
    feedbackCard: {
        backgroundColor: "#ECFDF5",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    feedbackText: {
        fontSize: 14,
        color: "#047857",
        fontWeight: "600" as const,
    },
    errorCard: {
        backgroundColor: "#FEF2F2",
        borderRadius: 16,
        padding: 16,
    },
    errorText: {
        fontSize: 14,
        color: "#B91C1C",
        fontWeight: "600" as const,
    },
});
