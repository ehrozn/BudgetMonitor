import { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "@/context/AppContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CreateAccountScreen() {
    const router = useRouter();
    const { addAccount } = useApp();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState<string>("");
    const [initialBalance, setInitialBalance] = useState<string>("");
    const [accountType, setAccountType] = useState<"main" | "side" | "savings">(
        "main"
    );
    const [error, setError] = useState<string>("");

    const handleCreate = () => {
        if (!name.trim()) {
            setError("Please enter account name");
            return;
        }

        const balance = parseFloat(initialBalance);
        if (isNaN(balance) || balance < 0) {
            setError("Enter a valid amount (0 or more)");
            return;
        }

        addAccount(name.trim(), accountType, balance);
        router.replace("/(tabs)");
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) },
                ]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Create your first account</Text>
                    <Text style={styles.subtitle}>
                        This will be the main account for tracking your finances
                    </Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.field}>
                        <Text style={styles.label}>Account Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                setError("");
                            }}
                            placeholder="Main account, Cash, Salary..."
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Initial Balance *</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                                style={[styles.input, styles.amountInput]}
                                value={initialBalance}
                                onChangeText={(text) => {
                                    setInitialBalance(text);
                                    setError("");
                                }}
                                placeholder="0"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Account Type</Text>
                        <View style={styles.typeButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    accountType === "main" && styles.typeButtonActive,
                                ]}
                                onPress={() => setAccountType("main")}
                            >
                                <Text
                                    style={[
                                        styles.typeButtonText,
                                        accountType === "main" && styles.typeButtonTextActive,
                                    ]}
                                >
                                    Main income
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    accountType === "side" && styles.typeButtonActive,
                                ]}
                                onPress={() => setAccountType("side")}
                            >
                                <Text
                                    style={[
                                        styles.typeButtonText,
                                        accountType === "side" && styles.typeButtonTextActive,
                                    ]}
                                >
                                    Side income
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    accountType === "savings" && styles.typeButtonActive,
                                ]}
                                onPress={() => setAccountType("savings")}
                            >
                                <Text
                                    style={[
                                        styles.typeButtonText,
                                        accountType === "savings" && styles.typeButtonTextActive,
                                    ]}
                                >
                                    Savings
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleCreate}
                >
                    <Text style={styles.createButtonText}>Create Account</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#F9FAFB",
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        flexGrow: 1,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: "700" as const,
        color: "#111827",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#6B7280",
        lineHeight: 24,
    },
    form: {
        gap: 24,
        flex: 1,
    },
    field: {
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#374151",
    },
    input: {
        backgroundColor: "#FFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: "#111827",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingLeft: 16,
    },
    currencySymbol: {
        fontSize: 18,
        fontWeight: "600" as const,
        color: "#6B7280",
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        borderWidth: 0,
        paddingLeft: 0,
    },
    typeButtons: {
        flexDirection: "row",
        gap: 12,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: "#FFF",
        borderWidth: 2,
        borderColor: "#E5E7EB",
        alignItems: "center",
    },
    typeButtonActive: {
        backgroundColor: "#EFF6FF",
        borderColor: "#3B82F6",
    },
    typeButtonText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    typeButtonTextActive: {
        color: "#3B82F6",
    },
    errorText: {
        fontSize: 14,
        color: "#EF4444",
        marginTop: 4,
    },
    createButton: {
        backgroundColor: "#3B82F6",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 24,
    },
    createButtonText: {
        fontSize: 18,
        fontWeight: "600" as const,
        color: "#FFF",
    },
});
