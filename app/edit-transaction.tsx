import { useState, useEffect, useMemo } from "react";
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
    Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, useCurrentAccount } from "../context/AppContext";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Calendar, Trash2 } from "lucide-react-native";

export default function EditTransactionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string }>();
    const { transactions, updateTransaction, deleteTransaction, getCategoriesByType, getActiveAccounts } = useApp();
    const currentAccount = useCurrentAccount();
    const insets = useSafeAreaInsets();

    const transaction = transactions.find((t) => t.id === params.id);

    const [amount, setAmount] = useState<string>("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [note, setNote] = useState<string>("");
    const [date, setDate] = useState<Date>(new Date());
    const [pendingDate, setPendingDate] = useState<Date>(new Date());
    const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
    const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const categories = getCategoriesByType(transaction?.type || "expense");
    const accounts = getActiveAccounts();

    useEffect(() => {
        if (transaction) {
            setAmount(transaction.amount.toString());
            setSelectedCategoryId(transaction.categoryId);
            setSelectedAccountId(transaction.accountId);
            setNote(transaction.note || "");
            const transactionDate = new Date(transaction.date);
            setDate(transactionDate);
            setPendingDate(transactionDate);
        }
    }, [transaction]);

    const formattedDate = useMemo(() => {
        return date.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }, [date]);

    const handleDateModeChange = (mode: "date" | "time") => {
        if (datePickerMode === mode) {
            return;
        }
        setDatePickerMode(mode);
    };

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS !== "ios" && event.type === "dismissed") {
            return;
        }
        if (selectedDate) {
            setPendingDate(selectedDate);
        }
    };

    const handleDateConfirm = () => {
        setDate(pendingDate);
        setShowDatePickerModal(false);
    };

    const handleSave = () => {
        if (!transaction) {
            setError("Transaction not found");
            return;
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setError("Enter a valid amount (greater than 0)");
            return;
        }

        if (!selectedCategoryId) {
            setError("Please select a category");
            return;
        }

        updateTransaction(transaction.id, {
            amount: amountNum,
            categoryId: selectedCategoryId,
            accountId: selectedAccountId,
            date: date.toISOString(),
            note: note || null,
        });

        router.back();
    };

    const handleDelete = () => {
        if (!transaction) return;

        Alert.alert(
            "Delete Transaction",
            "Are you sure you want to delete this transaction? This cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        deleteTransaction(transaction.id);
                        router.back();
                    },
                },
            ]
        );
    };

    if (!transaction || !currentAccount) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Transaction not found</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: insets.top + 24,
                        paddingBottom: insets.bottom + 32,
                    },
                ]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.form}>
                    <View style={styles.field}>
                        <Text style={styles.label}>Amount *</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                                style={[styles.input, styles.amountInput]}
                                value={amount}
                                onChangeText={(text) => {
                                    setAmount(text);
                                    setError("");
                                }}
                                placeholder="0.00"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    {accounts.length > 1 && (
                        <View style={styles.field}>
                            <Text style={styles.label}>Account *</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.categories}
                            >
                                {accounts.map((account) => (
                                    <TouchableOpacity
                                        key={account.id}
                                        style={[
                                            styles.categoryButton,
                                            selectedAccountId === account.id && styles.categoryButtonActive,
                                        ]}
                                        onPress={() => setSelectedAccountId(account.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.categoryButtonText,
                                                selectedAccountId === account.id && styles.categoryButtonTextActive,
                                            ]}
                                        >
                                            {account.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <View style={styles.field}>
                        <Text style={styles.label}>Category *</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categories}
                        >
                            {categories.map((category) => (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[
                                        styles.categoryButton,
                                        selectedCategoryId === category.id && styles.categoryButtonActive,
                                    ]}
                                    onPress={() => setSelectedCategoryId(category.id)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryButtonText,
                                            selectedCategoryId === category.id && styles.categoryButtonTextActive,
                                        ]}
                                    >
                                        {category.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Date *</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => {
                                setPendingDate(date);
                                setDatePickerMode("date");
                                setShowDatePickerModal(true);
                            }}
                        >
                            <Calendar color="#6B7280" size={20} />
                            <Text style={styles.dateButtonText}>{formattedDate}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Note (optional)</Text>
                        <TextInput
                            style={[styles.input, styles.noteInput]}
                            value={note}
                            onChangeText={setNote}
                            placeholder="Add a note..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                        />
                    </View>

                    {error ? <Text style={styles.errorMessage}>{error}</Text> : null}
                </View>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Trash2 color="#EF4444" size={20} />
                    <Text style={styles.deleteButtonText}>Delete Transaction</Text>
                </TouchableOpacity>

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
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal
                visible={showDatePickerModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDatePickerModal(false)}
            >
                <View style={styles.dateModalOverlay}>
                    <View style={styles.dateModalContent}>
                        <View style={styles.dateModalHeader}>
                            <Text style={styles.dateModalTitle}>Pick date and time</Text>
                            <View style={styles.dateModeSwitch}>
                                <TouchableOpacity
                                    style={[
                                        styles.dateModeButton,
                                        datePickerMode === "date" && styles.dateModeButtonActive,
                                    ]}
                                    onPress={() => handleDateModeChange("date")}
                                >
                                    <Text
                                        style={[
                                            styles.dateModeButtonText,
                                            datePickerMode === "date" && styles.dateModeButtonTextActive,
                                        ]}
                                    >
                                        Date
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.dateModeButton,
                                        datePickerMode === "time" && styles.dateModeButtonActive,
                                    ]}
                                    onPress={() => handleDateModeChange("time")}
                                >
                                    <Text
                                        style={[
                                            styles.dateModeButtonText,
                                            datePickerMode === "time" && styles.dateModeButtonTextActive,
                                        ]}
                                    >
                                        Time
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <DateTimePicker
                            value={pendingDate}
                            mode={datePickerMode}
                            display={Platform.OS === "ios" ? "spinner" : "default"}
                            onChange={handleDateChange}
                        />

                        <View style={styles.dateModalActions}>
                            <TouchableOpacity
                                style={[styles.dateModalActionButton, styles.dateModalCancelButton]}
                                onPress={() => setShowDatePickerModal(false)}
                            >
                                <Text style={styles.dateModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dateModalActionButton, styles.dateModalConfirmButton]}
                                onPress={handleDateConfirm}
                            >
                                <Text style={styles.dateModalConfirmText}>Set</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    noteInput: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#FFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dateButtonText: {
        fontSize: 16,
        color: "#111827",
        fontWeight: "500" as const,
    },
    categories: {
        gap: 8,
    },
    categoryButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#FFF",
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    categoryButtonActive: {
        backgroundColor: "#EFF6FF",
        borderColor: "#3B82F6",
    },
    categoryButtonText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    categoryButtonTextActive: {
        color: "#3B82F6",
    },
    deleteButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#FEE2E2",
        marginVertical: 24,
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#EF4444",
    },
    errorMessage: {
        fontSize: 14,
        color: "#EF4444",
        marginTop: 4,
    },
    errorText: {
        fontSize: 16,
        color: "#EF4444",
        textAlign: "center",
    },
    buttons: {
        flexDirection: "row",
        gap: 12,
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
    dateModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(17, 24, 39, 0.5)",
        justifyContent: "center",
        padding: 24,
    },
    dateModalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 20,
        gap: 20,
    },
    dateModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    dateModalTitle: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#111827",
    },
    dateModeSwitch: {
        flexDirection: "row",
        gap: 8,
    },
    dateModeButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: "#F3F4F6",
    },
    dateModeButtonActive: {
        backgroundColor: "#2563EB",
    },
    dateModeButtonText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#4B5563",
    },
    dateModeButtonTextActive: {
        color: "#FFFFFF",
    },
    dateModalActions: {
        flexDirection: "row",
        gap: 12,
    },
    dateModalActionButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    dateModalCancelButton: {
        backgroundColor: "#F3F4F6",
    },
    dateModalConfirmButton: {
        backgroundColor: "#2563EB",
    },
    dateModalCancelText: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#4B5563",
    },
    dateModalConfirmText: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#FFFFFF",
    },
});
