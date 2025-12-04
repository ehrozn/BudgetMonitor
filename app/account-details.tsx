import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ACCOUNT_COLORS } from "../constants/categories";

// TODO: Missing modules - waiting for user input or placeholders
// import { useApp } from "@/context/AppContext";
// import { AccountType } from "@/types";

// TEMPORARY PLACEHOLDERS
const useApp = () => ({
    accounts: [],
    addAccount: () => { },
    updateAccount: () => { },
    deleteAccount: () => ({ success: true }),
});
type AccountType = 'main' | 'side' | 'savings';

export default function AccountDetailsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string }>();
    const { accounts, addAccount, updateAccount, deleteAccount } = useApp();

    const isNewAccount = !params.id;
    const account = params.id ? accounts.find((a) => a.id === params.id) : null;

    const [name, setName] = useState<string>("");
    const [type, setType] = useState<AccountType>("main");
    const [initialBalance, setInitialBalance] = useState<string>("");
    const [currentBalance, setCurrentBalance] = useState<string>("");
    const [selectedColor, setSelectedColor] = useState<string>(ACCOUNT_COLORS[0]);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        if (account) {
            setName(account.name);
            setType(account.type);
            setInitialBalance(account.initialBalance.toString());
            setCurrentBalance(account.currentBalance.toString());
            setSelectedColor(account.color);
        }
    }, [account]);

    const handleSave = () => {
        if (!name.trim()) {
            setError("Please enter account name");
            return;
        }

        const balanceNum = parseFloat(initialBalance);
        if (isNaN(balanceNum) || balanceNum < 0) {
            setError("Enter a valid amount (0 or more)");
            return;
        }

        if (isNewAccount) {
            addAccount(name.trim(), type, balanceNum);
        } else if (account) {
            const currentBalanceNum = parseFloat(currentBalance);
            if (isNaN(currentBalanceNum) || currentBalanceNum < 0) {
                setError("Enter a valid current balance (0 or more)");
                return;
            }

            updateAccount(account.id, {
                name: name.trim(),
                type,
                currentBalance: currentBalanceNum,
                color: selectedColor,
            });
        }

        router.back();
    };

    const handleDelete = () => {
        if (!account) return;

        Alert.alert(
            "Delete Account",
            "Are you sure you want to delete this account? All transactions will also be deleted.",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        const result = deleteAccount(account.id);
                        if (!result.success) {
                            Alert.alert("Error", result.error || "Cannot delete account");
                        } else {
                            router.replace("/welcome");
                        }
                    },
                },
            ]
        );
    };

    const handleArchive = () => {
        if (!account) return;

        Alert.alert(
            "Archive Account",
            "This account will be hidden from the account list but all data will be preserved.",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Archive",
                    onPress: () => {
                        updateAccount(account.id, { isArchived: true });
                        router.back();
                    },
                },
            ]
        );
    };

    const accountTypes: { value: AccountType; label: string }[] = [
        { value: "main", label: "Main income" },
        { value: "side", label: "Side income" },
        { value: "savings", label: "Savings" },
    ];

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 16) }]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.form}>
                    <View style={styles.field}>
                        <Text style={styles.label}>Account name *</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                setError("");
                            }}
                            placeholder="Main account, Salary, Cash, etc."
                            placeholderTextColor="#9CA3AF"
                            autoFocus={isNewAccount}
                        />
                    </View>

                    {isNewAccount ? (
                        <View style={styles.field}>
                            <Text style={styles.label}>Initial balance *</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.currencySymbol}>$</Text>
                                <TextInput
                                    style={[styles.input, styles.amountInput]}
                                    value={initialBalance}
                                    onChangeText={(text) => {
                                        setInitialBalance(text);
                                        setError("");
                                    }}
                                    placeholder="0.00"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.field}>
                            <Text style={styles.label}>Current balance *</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.currencySymbol}>$</Text>
                                <TextInput
                                    style={[styles.input, styles.amountInput]}
                                    value={currentBalance}
                                    onChangeText={(text) => {
                                        setCurrentBalance(text);
                                        setError("");
                                    }}
                                    placeholder="0.00"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            <Text style={styles.balanceHint}>Adjust current balance if needed</Text>
                        </View>
                    )}

                    <View style={styles.field}>
                        <Text style={styles.label}>Account type</Text>
                        <View style={styles.typeButtons}>
                            {accountTypes.map((accountType) => (
                                <TouchableOpacity
                                    key={accountType.value}
                                    style={[
                                        styles.typeButton,
                                        type === accountType.value && styles.typeButtonActive,
                                    ]}
                                    onPress={() => setType(accountType.value)}
                                >
                                    <Text
                                        style={[
                                            styles.typeButtonText,
                                            type === accountType.value && styles.typeButtonTextActive,
                                        ]}
                                    >
                                        {accountType.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Color</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.colorButtons}
                        >
                            {ACCOUNT_COLORS.map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorButton,
                                        { backgroundColor: color },
                                        selectedColor === color && styles.colorButtonActive,
                                    ]}
                                    onPress={() => setSelectedColor(color)}
                                />
                            ))}
                        </ScrollView>
                    </View>

                    {error ? <Text style={styles.errorMessage}>{error}</Text> : null}
                </View>

                {!isNewAccount && account && (
                    <View style={styles.dangerZone}>
                        <TouchableOpacity style={styles.archiveButton} onPress={handleArchive}>
                            <Text style={styles.archiveButtonText}>Archive Account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                            <Text style={styles.deleteButtonText}>Delete Account</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.buttons}>
                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.saveButton]}
                        onPress={handleSave}
                    >
                        <Text style={styles.saveButtonText}>
                            {isNewAccount ? "Create Account" : "Save Changes"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    scrollContent: {
        padding: 24,
        flexGrow: 1,
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
        fontSize: 24,
        fontWeight: "700" as const,
        color: "#3B82F6",
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        borderWidth: 0,
        paddingLeft: 0,
        fontSize: 24,
        fontWeight: "600" as const,
    },
    balanceHint: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 4,
    },
    typeButtons: {
        gap: 8,
    },
    typeButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: "#FFF",
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    typeButtonActive: {
        backgroundColor: "#EFF6FF",
        borderColor: "#3B82F6",
    },
    typeButtonText: {
        fontSize: 15,
        fontWeight: "600" as const,
        color: "#6B7280",
        textAlign: "center",
    },
    typeButtonTextActive: {
        color: "#3B82F6",
    },
    colorButtons: {
        gap: 12,
    },
    colorButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: "transparent",
    },
    colorButtonActive: {
        borderColor: "#111827",
    },
    errorMessage: {
        fontSize: 14,
        color: "#EF4444",
    },
    dangerZone: {
        gap: 12,
        marginVertical: 24,
    },
    archiveButton: {
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#FEF3C7",
        alignItems: "center",
    },
    archiveButtonText: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#F59E0B",
    },
    deleteButton: {
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#FEE2E2",
        alignItems: "center",
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#EF4444",
    },
    buttons: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24,
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#FFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#374151",
    },
    saveButton: {
        backgroundColor: "#3B82F6",
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#FFF",
    },
});
