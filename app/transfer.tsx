import { useState, useMemo, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import {
    ArrowLeftRight,
    Calendar,
    Clock9,
    ChevronRight,
    Check,
    X,
    DollarSign,
    Sparkles,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useApp, useCurrentAccount } from "../context/AppContext";
import { hapticError, hapticLight, hapticSelection, hapticSuccess } from "../utils/haptics";

export default function TransferScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { getActiveAccounts, transferBetweenAccounts } = useApp();
    const currentAccount = useCurrentAccount();
    const accounts = getActiveAccounts();

    const [fromAccountId, setFromAccountId] = useState<string>(currentAccount?.id ?? accounts[0]?.id ?? "");
    const [toAccountId, setToAccountId] = useState<string>(() => {
        const fallback = accounts.find((account: any) => account.id !== (currentAccount?.id ?? accounts[0]?.id));
        return fallback?.id ?? "";
    });
    const [amount, setAmount] = useState<string>("");
    const [note, setNote] = useState<string>("");
    const [date, setDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [dateMode, setDateMode] = useState<"date" | "time">("date");
    const [pendingDate, setPendingDate] = useState<Date>(new Date());
    const [error, setError] = useState<string>("");
    const [pickerType, setPickerType] = useState<"from" | "to" | null>(null);

    useEffect(() => {
        if (!accounts.some((account: any) => account.id === fromAccountId)) {
            setFromAccountId(currentAccount?.id ?? accounts[0]?.id ?? "");
        }
    }, [accounts, fromAccountId, currentAccount]);

    useEffect(() => {
        if (!accounts.some((account: any) => account.id === toAccountId) || fromAccountId === toAccountId) {
            const fallback = accounts.find((account: any) => account.id !== fromAccountId);
            setToAccountId(fallback?.id ?? "");
        }
    }, [accounts, toAccountId, fromAccountId]);

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

    const fromAccount = accounts.find((account: any) => account.id === fromAccountId) ?? null;
    const toAccount = accounts.find((account: any) => account.id === toAccountId) ?? null;

    const amountValue = useMemo(() => {
        const numeric = Number.parseFloat(amount);
        if (Number.isNaN(numeric) || numeric <= 0) {
            return 0;
        }
        return Number.parseFloat(numeric.toFixed(2));
    }, [amount]);

    const projectedBalances = useMemo(() => {
        if (!fromAccount || !toAccount || amountValue <= 0) {
            return null;
        }

        const fromNext = Math.max(0, fromAccount.currentBalance - amountValue);
        const toNext = toAccount.currentBalance + amountValue;

        return {
            fromNext: Number(fromNext.toFixed(2)),
            toNext: Number(toNext.toFixed(2)),
        };
    }, [fromAccount, toAccount, amountValue]);

    useEffect(() => {
        if (!projectedBalances) {
            return;
        }
        console.log("[Transfer] Impact preview", {
            fromAccountId,
            toAccountId,
            amountValue,
            projectedBalances,
        });
    }, [projectedBalances, fromAccountId, toAccountId, amountValue]);

    const handleSwap = () => {
        hapticSelection();
        if (!fromAccountId || !toAccountId) {
            return;
        }
        setFromAccountId(toAccountId);
        setToAccountId(fromAccountId);
    };

    const handleAmountChange = (value: string) => {
        const cleaned = value.replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");
        if (parts.length > 2) {
            return;
        }
        if (parts[1] && parts[1].length > 2) {
            return;
        }
        setAmount(cleaned);
        setError("");
    };

    const handleConfirmDate = () => {
        setDate(pendingDate);
        setShowDatePicker(false);
        setError("");
        hapticSelection();
    };

    const quickAmounts = useMemo(() => {
        if (!fromAccount) {
            return [];
        }
        const fractions = [0.1, 0.25, 0.5];
        return fractions
            .map((fraction) => Math.max(0, fromAccount.currentBalance * fraction))
            .filter((value) => value > 0)
            .map((value) => Math.min(value, fromAccount.currentBalance));
    }, [fromAccount]);

    const handleSelectQuickAmount = (value: number) => {
        hapticSelection();
        setAmount(value.toFixed(2));
        setError("");
    };

    const handleTransfer = () => {
        if (!fromAccount || !toAccount) {
            setError("Select two accounts to continue");
            hapticError();
            return;
        }

        if (fromAccount.id === toAccount.id) {
            setError("Choose different accounts");
            hapticError();
            return;
        }

        const amountValue = Number.parseFloat(amount);
        if (Number.isNaN(amountValue) || amountValue <= 0) {
            setError("Enter a valid amount");
            hapticError();
            return;
        }

        if (amountValue > fromAccount.currentBalance) {
            setError("Amount exceeds available balance");
            hapticError();
            return;
        }

        const result = transferBetweenAccounts({
            fromAccountId: fromAccount.id,
            toAccountId: toAccount.id,
            amount: amountValue,
            date: date.toISOString(),
            note: note ? note.trim() : null,
        });

        if (!result.success) {
            setError(result.error ?? "Could not complete transfer");
            hapticError();
            return;
        }

        hapticSuccess();
        router.back();
    };

    const renderAccountPicker = (type: "from" | "to") => (
        <Modal
            transparent
            animationType="slide"
            visible={pickerType === type}
            onRequestClose={() => setPickerType(null)}
        >
            <View style={styles.pickerOverlay}>
                <View style={styles.pickerSheet}>
                    <View style={styles.pickerHeader}>
                        <Text style={styles.pickerTitle}>
                            {type === "from" ? "Choose source" : "Choose destination"}
                        </Text>
                        <TouchableOpacity onPress={() => setPickerType(null)} accessibilityRole="button">
                            <X color="#6B7280" size={22} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.pickerList}>
                        {accounts.map((account: any) => {
                            const isSelected = (type === "from" ? fromAccountId : toAccountId) === account.id;
                            return (
                                <TouchableOpacity
                                    key={account.id}
                                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                                    onPress={() => {
                                        hapticSelection();
                                        if (type === "from") {
                                            setFromAccountId(account.id);
                                            if (account.id === toAccountId) {
                                                const fallback = accounts.find((candidate: any) => candidate.id !== account.id);
                                                setToAccountId(fallback?.id ?? "");
                                            }
                                        } else {
                                            setToAccountId(account.id);
                                            if (account.id === fromAccountId) {
                                                const fallback = accounts.find((candidate: any) => candidate.id !== account.id);
                                                setFromAccountId(fallback?.id ?? "");
                                            }
                                        }
                                        setPickerType(null);
                                    }}
                                    testID={`account-picker-${type}-${account.id}`}
                                >
                                    <View style={styles.pickerItemLeft}>
                                        <View style={[styles.pickerAvatar, { backgroundColor: account.color }]}>
                                            <DollarSign color="#FFF" size={18} />
                                        </View>
                                        <View>
                                            <Text style={styles.pickerName}>{account.name}</Text>
                                            <Text style={styles.pickerBalance}>${account.currentBalance.toFixed(2)}</Text>
                                        </View>
                                    </View>
                                    {isSelected ? <Check color="#2563EB" size={20} /> : <ChevronRight color="#D1D5DB" size={20} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    if (accounts.length < 2) {
        return (
            <View style={[styles.emptyContainer, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
                testID="transfer-empty"
            >
                <Sparkles color="#1D4ED8" size={36} />
                <Text style={styles.emptyTitle}>You need at least two accounts</Text>
                <Text style={styles.emptySubtitle}>
                    Create another account to start moving money with transfers.
                </Text>
                <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => router.push("/account-details")}
                    testID="transfer-create-account"
                >
                    <Text style={styles.emptyButtonText}>Create account</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
                ]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <LinearGradient colors={["#111827", "#1F2937"]} style={styles.headerCard}>
                        <View style={styles.headerRow}>
                            <Text style={styles.headerLabel}>Transfer between accounts</Text>
                            <ArrowLeftRight color="#93C5FD" size={22} />
                        </View>
                        <Text style={styles.headerTitle}>Move money with intention</Text>
                        <Text style={styles.headerSubtitle}>
                            Keep your savings and daily funds in sync by reallocating balances.
                        </Text>
                    </LinearGradient>
                </View>

                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Accounts</Text>
                        <TouchableOpacity style={styles.swapButton} onPress={handleSwap} testID="swap-accounts">
                            <ArrowLeftRight color="#2563EB" size={18} />
                            <Text style={styles.swapButtonText}>Swap</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.accountPill}
                        onPress={() => {
                            hapticLight();
                            setPickerType("from");
                        }}
                        testID="from-account"
                    >
                        <View style={styles.accountLabelWrapper}>
                            <Text style={styles.accountLabel}>From</Text>
                            <Text style={styles.accountName}>{fromAccount?.name ?? "Select account"}</Text>
                        </View>
                        <ChevronRight color="#9CA3AF" size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.accountPill, styles.accountPillSecondary]}
                        onPress={() => {
                            hapticLight();
                            setPickerType("to");
                        }}
                        testID="to-account"
                    >
                        <View style={styles.accountLabelWrapper}>
                            <Text style={[styles.accountLabel, styles.accountLabelSecondary]}>To</Text>
                            <Text style={[styles.accountName, styles.accountNameSecondary]}>{toAccount?.name ?? "Select account"}</Text>
                        </View>
                        <ChevronRight color="#E5E7EB" size={20} />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Amount</Text>
                        <View style={styles.amountRow}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={handleAmountChange}
                                placeholder="0.00"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="decimal-pad"
                                returnKeyType="done"
                                maxLength={12}
                                testID="transfer-amount"
                            />
                        </View>
                        {quickAmounts.length > 0 ? (
                            <View style={styles.quickGrid}>
                                {quickAmounts.map((value: number) => (
                                    <TouchableOpacity
                                        key={value}
                                        style={styles.quickChip}
                                        onPress={() => handleSelectQuickAmount(value)}
                                        testID={`quick-amount-${value}`}
                                    >
                                        <Text style={styles.quickChipText}>${value.toFixed(0)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : null}
                    </View>

                    {projectedBalances ? (
                        <View style={styles.impactCard} testID="transfer-impact-card">
                            <View style={styles.impactHeader}>
                                <View style={styles.impactIcon}>
                                    <Sparkles color="#FDE68A" size={16} />
                                </View>
                                <View>
                                    <Text style={styles.impactTitle}>Impact preview</Text>
                                    <Text style={styles.impactSubtitle}>Balances right after transfer</Text>
                                </View>
                            </View>
                            <View style={styles.impactRows}>
                                <View style={styles.impactRow}>
                                    <View>
                                        <Text style={styles.impactLabel}>From</Text>
                                        <Text style={styles.impactName}>{fromAccount?.name}</Text>
                                    </View>
                                    <View style={styles.impactBalanceBlock}>
                                        <Text style={styles.impactBalanceLabel}>New balance</Text>
                                        <Text style={styles.impactBalanceValue}>${projectedBalances.fromNext.toFixed(2)}</Text>
                                    </View>
                                    <View style={[styles.impactDelta, styles.impactDeltaNegative]}>
                                        <Text style={styles.impactDeltaText}>-${amountValue.toFixed(2)}</Text>
                                    </View>
                                </View>
                                <View style={styles.impactDivider} />
                                <View style={styles.impactRow}>
                                    <View>
                                        <Text style={styles.impactLabel}>To</Text>
                                        <Text style={styles.impactName}>{toAccount?.name}</Text>
                                    </View>
                                    <View style={styles.impactBalanceBlock}>
                                        <Text style={styles.impactBalanceLabel}>New balance</Text>
                                        <Text style={styles.impactBalanceValue}>${projectedBalances.toNext.toFixed(2)}</Text>
                                    </View>
                                    <View style={[styles.impactDelta, styles.impactDeltaPositive]}>
                                        <Text style={styles.impactDeltaText}>+${amountValue.toFixed(2)}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ) : null}

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Schedule</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => {
                                hapticSelection();
                                setPendingDate(date);
                                setDateMode("date");
                                setShowDatePicker(true);
                            }}
                            testID="transfer-date"
                        >
                            <Calendar color="#1D4ED8" size={18} />
                            <Text style={styles.dateValue}>{formattedDate}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Note</Text>
                        <TextInput
                            style={styles.noteInput}
                            value={note}
                            onChangeText={(value) => {
                                setNote(value);
                                setError("");
                            }}
                            placeholder="Optional details"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            maxLength={160}
                            testID="transfer-note"
                        />
                        {note.length > 0 ? <Text style={styles.noteCount}>{note.length}/160</Text> : null}
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleTransfer} testID="submit-transfer">
                    <Text style={styles.primaryButtonText}>Transfer now</Text>
                </TouchableOpacity>
            </ScrollView>

            {showDatePicker ? (
                <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                    <View style={styles.dateOverlay}>
                        <View style={styles.dateSheet}>
                            <View style={styles.dateHeader}>
                                <Text style={styles.dateTitle}>Pick date & time</Text>
                                <View style={styles.modeSwitch}>
                                    {(["date", "time"] as const).map((mode) => (
                                        <TouchableOpacity
                                            key={mode}
                                            style={[styles.modeChip, dateMode === mode && styles.modeChipActive]}
                                            onPress={() => setDateMode(mode)}
                                            testID={`date-mode-${mode}`}
                                        >
                                            {mode === "date" ? <Calendar color={dateMode === mode ? "#FFF" : "#4B5563"} size={16} /> : <Clock9 color={dateMode === mode ? "#FFF" : "#4B5563"} size={16} />}
                                            <Text
                                                style={[styles.modeChipText, dateMode === mode && styles.modeChipTextActive]}
                                            >
                                                {mode === "date" ? "Date" : "Time"}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <DateTimePicker
                                value={pendingDate}
                                mode={dateMode}
                                display={Platform.OS === "ios" ? "spinner" : "default"}
                                onChange={(event, selectedDate) => {
                                    if (Platform.OS !== "ios" && event.type === "dismissed") {
                                        return;
                                    }
                                    if (selectedDate) {
                                        setPendingDate(selectedDate);
                                    }
                                }}
                            />

                            <View style={styles.dateActions}>
                                <TouchableOpacity
                                    style={[styles.dateButtonControl, styles.dateCancel]}
                                    onPress={() => setShowDatePicker(false)}
                                    testID="dismiss-date-picker"
                                >
                                    <Text style={styles.dateCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.dateButtonControl, styles.dateConfirm]}
                                    onPress={handleConfirmDate}
                                    testID="confirm-transfer-date"
                                >
                                    <Text style={styles.dateConfirmText}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            ) : null}

            {renderAccountPicker("from")}
            {renderAccountPicker("to")}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0F172A",
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 20,
    },
    header: {
        marginBottom: 4,
    },
    headerCard: {
        borderRadius: 24,
        padding: 24,
        gap: 12,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerLabel: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 13,
        letterSpacing: 0.5,
        textTransform: "uppercase" as const,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: "700" as const,
        color: "#F3F4F6",
    },
    headerSubtitle: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 14,
        lineHeight: 20,
    },
    card: {
        backgroundColor: "#111827",
        borderRadius: 24,
        padding: 20,
        gap: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#E5E7EB",
    },
    swapButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "rgba(37,99,235,0.15)",
    },
    swapButtonText: {
        fontSize: 13,
        fontWeight: "600" as const,
        color: "#60A5FA",
    },
    accountPill: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    accountPillSecondary: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.04)",
    },
    accountLabelWrapper: {
        gap: 6,
    },
    accountLabel: {
        fontSize: 13,
        color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase" as const,
        letterSpacing: 0.6,
    },
    accountName: {
        fontSize: 18,
        fontWeight: "600" as const,
        color: "#F3F4F6",
    },
    accountLabelSecondary: {
        color: "rgba(255,255,255,0.6)",
    },
    accountNameSecondary: {
        color: "#93C5FD",
    },
    field: {
        gap: 10,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#D1D5DB",
    },
    amountRow: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.02)",
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: "700" as const,
        color: "#60A5FA",
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        fontSize: 28,
        fontWeight: "700" as const,
        color: "#F9FAFB",
    },
    quickGrid: {
        flexDirection: "row",
        flexWrap: "wrap" as const,
        gap: 8,
    },
    quickChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "rgba(59,130,246,0.15)",
    },
    quickChipText: {
        color: "#93C5FD",
        fontWeight: "600" as const,
    },
    impactCard: {
        borderRadius: 20,
        padding: 16,
        backgroundColor: "rgba(59,130,246,0.12)",
        gap: 12,
        borderWidth: 1,
        borderColor: "rgba(59,130,246,0.3)",
    },
    impactHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    impactIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: "rgba(253, 230, 138, 0.18)",
        alignItems: "center",
        justifyContent: "center",
    },
    impactTitle: {
        fontSize: 15,
        fontWeight: "700" as const,
        color: "#F3F4F6",
    },
    impactSubtitle: {
        fontSize: 13,
        color: "rgba(243,244,246,0.75)",
    },
    impactRows: {
        gap: 10,
    },
    impactRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    impactLabel: {
        fontSize: 12,
        color: "rgba(243,244,246,0.65)",
        textTransform: "uppercase" as const,
        letterSpacing: 0.6,
    },
    impactName: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#F9FAFB",
    },
    impactBalanceBlock: {
        flex: 1,
        alignItems: "flex-end",
    },
    impactBalanceLabel: {
        fontSize: 12,
        color: "rgba(243,244,246,0.65)",
    },
    impactBalanceValue: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#E0E7FF",
    },
    impactDelta: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    impactDeltaPositive: {
        backgroundColor: "rgba(16,185,129,0.2)",
    },
    impactDeltaNegative: {
        backgroundColor: "rgba(239,68,68,0.2)",
    },
    impactDeltaText: {
        fontSize: 13,
        fontWeight: "700" as const,
        color: "#F3F4F6",
    },
    impactDivider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
        backgroundColor: "rgba(255,255,255,0.03)",
    },
    dateValue: {
        color: "#F9FAFB",
        fontSize: 16,
        fontWeight: "600" as const,
    },
    noteInput: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        padding: 16,
        minHeight: 100,
        color: "#F3F4F6",
        textAlignVertical: "top",
        backgroundColor: "rgba(255,255,255,0.02)",
    },
    noteCount: {
        fontSize: 12,
        color: "#9CA3AF",
        textAlign: "right" as const,
    },
    errorText: {
        color: "#F87171",
        fontSize: 14,
        fontWeight: "600" as const,
    },
    primaryButton: {
        borderRadius: 18,
        backgroundColor: "#2563EB",
        paddingVertical: 18,
        alignItems: "center",
        shadowColor: "#2563EB",
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
    },
    primaryButtonText: {
        color: "#FFF",
        fontSize: 17,
        fontWeight: "700" as const,
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    pickerSheet: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "75%",
        paddingBottom: 24,
    },
    pickerHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#111827",
    },
    pickerList: {
        padding: 16,
        gap: 12,
    },
    pickerItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F9FAFB",
        borderRadius: 16,
        padding: 16,
    },
    pickerItemActive: {
        borderWidth: 1,
        borderColor: "#2563EB",
        backgroundColor: "#EFF6FF",
    },
    pickerItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    pickerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    pickerName: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#111827",
    },
    pickerBalance: {
        fontSize: 13,
        color: "#6B7280",
    },
    dateOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        padding: 24,
    },
    dateSheet: {
        backgroundColor: "#FFF",
        borderRadius: 24,
        padding: 20,
        gap: 18,
    },
    dateHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    dateTitle: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#111827",
    },
    modeSwitch: {
        flexDirection: "row",
        gap: 8,
    },
    modeChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#F3F4F6",
    },
    modeChipActive: {
        backgroundColor: "#2563EB",
    },
    modeChipText: {
        fontSize: 13,
        fontWeight: "600" as const,
        color: "#4B5563",
    },
    modeChipTextActive: {
        color: "#FFF",
    },
    dateActions: {
        flexDirection: "row",
        gap: 12,
    },
    dateButtonControl: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
    },
    dateCancel: {
        backgroundColor: "#F3F4F6",
    },
    dateConfirm: {
        backgroundColor: "#2563EB",
    },
    dateCancelText: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#4B5563",
    },
    dateConfirmText: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFF",
    },
    emptyContainer: {
        flex: 1,
        paddingHorizontal: 32,
        backgroundColor: "#0F172A",
        alignItems: "center",
        gap: 20,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "700" as const,
        color: "#F9FAFB",
        textAlign: "center" as const,
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#9CA3AF",
        textAlign: "center" as const,
        lineHeight: 22,
    },
    emptyButton: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 999,
        backgroundColor: "#2563EB",
    },
    emptyButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "700" as const,
    },
});
