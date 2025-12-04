import { useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
    Wallet,
    ChevronRight,
    Globe,
    Cloud,
    Settings as SettingsIcon,
    ArrowLeftRight,
    Coins,
} from "lucide-react-native";

// TODO: Missing modules - waiting for user input or placeholders
// import { useApp } from "../../../context/AppContext";

// TEMPORARY PLACEHOLDER
const useApp = () => ({
    getActiveAccounts: () => [],
    getTotalBalance: () => 0.00,
});

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { getActiveAccounts, getTotalBalance } = useApp();
    const accounts = getActiveAccounts();
    const totalBalance = useMemo(() => getTotalBalance(), [getTotalBalance]);

    return (
        <View style={styles.container} testID="settings-screen">
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
                ]}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Settings</Text>
                    <Text style={styles.subtitle}>Fine-tune your budgeting experience</Text>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Accounts</Text>
                        <Text style={styles.sectionCaption}>Total balance ${totalBalance.toFixed(2)}</Text>
                    </View>
                    <View style={styles.card}>
                        {accounts.length === 0 ? (
                            <View style={styles.emptyState} testID="settings-no-accounts">
                                <Text style={styles.emptyTitle}>No active accounts</Text>
                                <Text style={styles.emptySubtitle}>
                                    Create an account to start tracking your money.
                                </Text>
                            </View>
                        ) : (
                            accounts.map((account, index) => (
                                <TouchableOpacity
                                    key={account.id}
                                    style={[
                                        styles.menuItem,
                                        index < accounts.length - 1 && styles.menuItemBorder,
                                    ]}
                                    onPress={() => {
                                        router.push({
                                            pathname: "/account-details",
                                            params: { id: account.id },
                                        });
                                    }}
                                    testID={`settings-account-${account.id}`}
                                >
                                    <View style={styles.menuItemLeft}>
                                        <View
                                            style={[
                                                styles.iconContainer,
                                                { backgroundColor: account.color || "#2563EB" },
                                            ]}
                                        >
                                            <Wallet color="#FFF" size={20} />
                                        </View>
                                        <View style={styles.menuItemContent}>
                                            <Text style={styles.menuItemTitle}>{account.name}</Text>
                                            <Text style={styles.menuItemSubtitle}>
                                                ${account.currentBalance.toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                    <ChevronRight color="#9CA3AF" size={20} />
                                </TouchableOpacity>
                            ))
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            router.push("/account-details");
                        }}
                        testID="settings-add-account"
                    >
                        <Text style={styles.addButtonText}>+ Add Account</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Financial setup</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={[styles.menuItem, styles.menuItemBorder]}
                            onPress={() => {
                                router.push("/(tabs)/settings/backup-restore");
                            }}
                            testID="settings-backup"
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: "#10B981" }]}>
                                    <Cloud color="#FFF" size={20} />
                                </View>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Backup & Restore</Text>
                                    <Text style={styles.menuItemSubtitle}>
                                        Manage local and cloud backups securely
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight color="#9CA3AF" size={20} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                router.push("/(tabs)/settings/app-preferences");
                            }}
                            testID="settings-app-preferences"
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: "#F59E0B" }]}>
                                    <Globe color="#FFF" size={20} />
                                </View>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>App preferences</Text>
                                    <Text style={styles.menuItemSubtitle}>
                                        Manage language, currency, and personalization
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight color="#9CA3AF" size={20} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Automation</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={[styles.menuItem, styles.menuItemBorder]}
                            onPress={() => {
                                router.push("/recurring-manager");
                            }}
                            testID="settings-recurring"
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: "#6366F1" }]}>
                                    <SettingsIcon color="#FFF" size={20} />
                                </View>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Recurring planners</Text>
                                    <Text style={styles.menuItemSubtitle}>
                                        Configure automatic incomes and bills
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight color="#9CA3AF" size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.menuItem, styles.menuItemBorder]}
                            onPress={() => {
                                router.push("/transfer-automation");
                            }}
                            testID="settings-smart-transfers"
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: "#0EA5E9" }]}>
                                    <ArrowLeftRight color="#FFF" size={20} />
                                </View>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Smart transfers</Text>
                                    <Text style={styles.menuItemSubtitle}>
                                        Divert income into savings automatically
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight color="#9CA3AF" size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                router.push("/income-distribution");
                            }}
                            testID="settings-income-distribution"
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.iconContainer, { backgroundColor: "#10B981" }]}>
                                    <Coins color="#FFF" size={20} />
                                </View>
                                <View style={styles.menuItemContent}>
                                    <Text style={styles.menuItemTitle}>Income distribution</Text>
                                    <Text style={styles.menuItemSubtitle}>
                                        Automatically allocate income to charity, tax, and savings
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight color="#9CA3AF" size={20} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App info</Text>
                    <View style={styles.card}>
                        <View style={styles.menuItem} testID="settings-app-version">
                            <Text style={styles.infoLabel}>Version</Text>
                            <Text style={styles.infoValue}>1.0.0</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    header: {
        marginBottom: 24,
        gap: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: "700" as const,
        color: "#111827",
    },
    subtitle: {
        fontSize: 16,
        color: "#6B7280",
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600" as const,
        color: "#374151",
    },
    sectionCaption: {
        fontSize: 14,
        color: "#6B7280",
    },
    card: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        overflow: "hidden",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 18,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    menuItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        columnGap: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    menuItemContent: {
        flex: 1,
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#111827",
        marginBottom: 2,
    },
    menuItemSubtitle: {
        fontSize: 14,
        color: "#6B7280",
    },
    addButton: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 18,
        alignItems: "center",
        marginTop: 12,
        borderWidth: 2,
        borderColor: "#E5E7EB",
        borderStyle: "dashed",
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#3B82F6",
    },
    infoLabel: {
        fontSize: 16,
        color: "#374151",
    },
    infoValue: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    emptyState: {
        padding: 20,
        alignItems: "center",
        gap: 6,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#111827",
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
    },
});
