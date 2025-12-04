import { useCallback, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    Modal,
    TextInput,
    Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
    ChevronLeft,
    CalendarClock,
    Sparkles,
    Repeat,
    Trash2,
    Pencil,
    Power,
    ArrowRightCircle,
} from "lucide-react-native";
import { getCategoryIconComponent } from "../constants/categoryIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useApp } from "../context/AppContext";
import { hapticLight, hapticSelection, hapticSuccess } from "../utils/haptics";
import type { RecurringTransaction } from "../types";

function computeNextOccurrence(previous: Date, recurring: RecurringTransaction, baseStart: Date): Date {
    const next = new Date(previous);

    switch (recurring.repeatInterval) {
        case "daily":
            next.setDate(next.getDate() + 1);
            break;
        case "weekly":
            next.setDate(next.getDate() + 7);
            break;
        case "monthly": {
            const targetDay = recurring.repeatDay ?? baseStart.getDate();
            next.setMonth(next.getMonth() + 1);
            const monthLength = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
            next.setDate(Math.min(targetDay, monthLength));
            break;
        }
        case "yearly":
            next.setFullYear(next.getFullYear() + 1);
            break;
        default:
            next.setDate(next.getDate() + 1);
    }

    return next;
}

function getNextRun(recurring: RecurringTransaction): Date | null {
    const start = new Date(recurring.startDate);
    if (Number.isNaN(start.getTime())) {
        return null;
    }
    const now = new Date();
    let next: Date;

    if (recurring.processedOccurrences === 0) {
        next = start;
    } else if (recurring.lastGeneratedAt) {
        next = computeNextOccurrence(new Date(recurring.lastGeneratedAt), recurring, start);
    } else {
        next = start;
    }

    const endDate = recurring.endDate ? new Date(recurring.endDate) : null;
    if (recurring.endType === "endDate" && endDate) {
        const endBoundary = new Date(endDate);
        endBoundary.setHours(23, 59, 59, 999);
        if (next > endBoundary) {
            return null;
        }
    }

    if (recurring.endType === "occurrences" && recurring.occurrences !== null) {
        if (recurring.processedOccurrences >= recurring.occurrences) {
            return null;
        }
    }

    while (next <= now) {
        next = computeNextOccurrence(next, recurring, start);

        if (recurring.endType === "occurrences" && recurring.occurrences !== null) {
            if (recurring.processedOccurrences + 1 >= recurring.occurrences) {
                return null;
            }
        }

        if (recurring.endType === "endDate" && endDate) {
            const boundary = new Date(endDate);
            boundary.setHours(23, 59, 59, 999);
            if (next > boundary) {
                return null;
            }
        }

        if (next > now) {
            break;
        }
    }

    return next > now ? next : null;
}

function formatFrequency(recurring: RecurringTransaction): string {
    switch (recurring.repeatInterval) {
        case "daily":
            return "Every day";
        case "weekly":
            return "Every week";
        case "monthly": {
            const day = recurring.repeatDay ?? new Date(recurring.startDate).getDate();
            return `Monthly on day ${day}`;
        }
        case "yearly": {
            const date = new Date(recurring.startDate);
            return `Yearly on ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
        }
        default:
            return "Scheduled";
    }
}

export default function RecurringManagerScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const {
        recurringTransactions,
        accounts,
        categories,
        toggleRecurringTransaction,
        deleteRecurringTransaction,
        updateRecurringTransaction,
        processRecurringTransactions,
    } = useApp();

    const [editing, setEditing] = useState<RecurringTransaction | null>(null);
    const [amountInput, setAmountInput] = useState<string>("");
    const [noteInput, setNoteInput] = useState<string>("");
    const [repeatInterval, setRepeatInterval] = useState<RecurringTransaction["repeatInterval"]>("monthly");
    const [repeatDay, setRepeatDay] = useState<number | null>(null);
    const [endType, setEndType] = useState<RecurringTransaction["endType"]>("never");
    const [endDateValue, setEndDateValue] = useState<Date | null>(null);
    const [occurrenceCount, setOccurrenceCount] = useState<string>("");
    const [showEndDatePicker, setShowEndDatePicker] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const mapped = useMemo(() => {
        return recurringTransactions
            .map((item: any) => {
                const account = accounts.find((acc: any) => acc.id === item.accountId);
                const category = categories.find((cat: any) => cat.id === item.categoryId);
                const nextRun = getNextRun(item);
                return {
                    ...item,
                    accountName: account ? account.name : "Unknown account",
                    categoryName: item.customCategoryName || category?.name || "Other",
                    categoryIcon: category?.icon || "TimerReset",
                    nextRun,
                };
            })
            .sort((a: any, b: any) => {
                if (a.nextRun && b.nextRun) {
                    return a.nextRun.getTime() - b.nextRun.getTime();
                }
                if (a.nextRun) return -1;
                if (b.nextRun) return 1;
                return a.categoryName.localeCompare(b.categoryName);
            });
    }, [recurringTransactions, accounts, categories]);

    const totals = useMemo(() => {
        const active = mapped.filter((item: any) => item.isActive).length;
        const paused = mapped.length - active;
        const monthlyImpact = mapped
            .filter((item: any) => item.isActive)
            .reduce((sum: number, item: any) => {
                if (item.repeatInterval === "daily") {
                    return sum + item.amount * 30;
                }
                if (item.repeatInterval === "weekly") {
                    return sum + item.amount * 4;
                }
                if (item.repeatInterval === "monthly") {
                    return sum + item.amount;
                }
                if (item.repeatInterval === "yearly") {
                    return sum + item.amount / 12;
                }
                return sum;
            }, 0);
        return {
            total: mapped.length,
            active,
            paused,
            monthlyImpact,
        };
    }, [mapped]);

    const handleBack = useCallback(() => {
        hapticLight();
        router.back();
    }, [router]);

    const handleToggle = useCallback(
        (recurring: RecurringTransaction, value: boolean) => {
            hapticSelection();
            toggleRecurringTransaction(recurring.id!, value);
            processRecurringTransactions();
        },
        [toggleRecurringTransaction, processRecurringTransactions],
    );

    const handleDelete = useCallback(
        (recurring: RecurringTransaction) => {
            Alert.alert(
                "Delete schedule",
                "Are you sure you want to remove this recurring plan? Existing transactions will stay.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                            hapticSelection();
                            deleteRecurringTransaction(recurring.id!);
                        },
                    },
                ],
            );
        },
        [deleteRecurringTransaction],
    );

    const openEditModal = useCallback(
        (recurring: RecurringTransaction) => {
            setEditing(recurring);
            setAmountInput(recurring.amount.toString());
            setNoteInput(recurring.note ?? "");
            setRepeatInterval(recurring.repeatInterval);
            setRepeatDay(recurring.repeatDay ?? null);
            setEndType(recurring.endType);
            setEndDateValue(recurring.endDate ? new Date(recurring.endDate) : null);
            setOccurrenceCount(recurring.occurrences ? String(recurring.occurrences) : "");
            setError("");
        },
        [],
    );

    const closeEditModal = () => {
        setEditing(null);
        setShowEndDatePicker(false);
        setError("");
    };

    const validateEdit = () => {
        if (!editing) {
            return null;
        }

        const amount = Number.parseFloat(amountInput);
        if (Number.isNaN(amount) || amount <= 0) {
            setError("Enter a valid amount");
            return null;
        }

        let repeatDayValue: number | null = null;
        if (repeatInterval === "monthly") {
            const day = repeatDay ?? new Date(editing.startDate).getDate();
            if (day < 1 || day > 31) {
                setError("Select a day between 1 and 31");
                return null;
            }
            repeatDayValue = day;
        }

        let occurrencesValue: number | null = null;
        if (endType === "occurrences") {
            const parsed = Number.parseInt(occurrenceCount, 10);
            if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 500) {
                setError("Set occurrences between 1 and 500");
                return null;
            }
            occurrencesValue = parsed;
        }

        let endDateIso: string | null = null;
        if (endType === "endDate") {
            if (!endDateValue) {
                setError("Choose an end date");
                return null;
            }
            const startMidnight = new Date(editing.startDate);
            startMidnight.setHours(0, 0, 0, 0);
            const endMidnight = new Date(endDateValue);
            endMidnight.setHours(0, 0, 0, 0);
            if (endMidnight < startMidnight) {
                setError("End date must be after the start date");
                return null;
            }
            endDateIso = endDateValue.toISOString();
        }

        return { amount, repeatDayValue, occurrencesValue, endDateIso };
    };

    const handleUpdate = () => {
        if (!editing) {
            return;
        }

        const validated = validateEdit();
        if (!validated) {
            return;
        }

        updateRecurringTransaction(editing.id!, {
            amount: validated.amount,
            note: noteInput.trim() ? noteInput.trim() : null,
            repeatInterval,
            repeatDay: repeatInterval === "monthly" ? validated.repeatDayValue : null,
            endType,
            endDate: validated.endDateIso,
            occurrences: endType === "occurrences" ? validated.occurrencesValue : null,
        });

        processRecurringTransactions();
        hapticSuccess();
        closeEditModal();
    };

    const renderNextRun = (item: typeof mapped[number]) => {
        if (item.nextRun) {
            return item.nextRun.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        }
        if (item.endType === "occurrences" && item.occurrences !== null && item.processedOccurrences >= item.occurrences) {
            return "Completed";
        }
        if (item.endType === "endDate" && item.endDate) {
            return "Finished";
        }
        return "Pending";
    };

    const CTA = mapped.length === 0 ? (
        <View style={styles.emptyCard} testID="recurring-empty">
            <CalendarClock color="#2563EB" size={36} />
            <Text style={styles.emptyTitle}>No plans yet</Text>
            <Text style={styles.emptySubtitle}>
                Automate your salary, rent, mortgage, or any repeating bills. We will add new transactions for you.
            </Text>
            <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                    hapticLight();
                    router.push({ pathname: "/add-transaction", params: { type: "income" } });
                }}
                testID="recurring-add-first"
            >
                <Text style={styles.primaryButtonText}>Create first schedule</Text>
            </TouchableOpacity>
        </View>
    ) : null;

    return (
        <View style={styles.wrapper}>
            <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}
                testID="recurring-header"
            >
                <TouchableOpacity onPress={handleBack} style={styles.backButton} testID="recurring-back">
                    <ChevronLeft color="#111827" size={24} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Recurring planners</Text>
                    <Text style={styles.headerSubtitle}>
                        Automate upcoming income and expense schedules.
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.flex}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 48, gap: 24 }}
            >
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryPill}>
                            <Sparkles color="#2563EB" size={18} />
                            <Text style={styles.summaryPillText}>{totals.total} total</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.syncButton}
                            onPress={() => {
                                hapticSelection();
                                processRecurringTransactions();
                            }}
                            testID="recurring-sync"
                        >
                            <Repeat color="#2563EB" size={18} />
                            <Text style={styles.syncText}>Sync now</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.summaryStatsRow}>
                        <View style={styles.summaryStat}>
                            <Text style={styles.summaryValue}>{totals.active}</Text>
                            <Text style={styles.summaryLabel}>Active</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryStat}>
                            <Text style={styles.summaryValueMuted}>{totals.paused}</Text>
                            <Text style={styles.summaryLabel}>Paused</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryStat}>
                            <Text style={styles.summaryValue}>${totals.monthlyImpact.toFixed(2)}</Text>
                            <Text style={styles.summaryLabel}>Monthly impact</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => {
                            hapticLight();
                            router.push({ pathname: "/add-transaction", params: { type: "expense" } });
                        }}
                        testID="recurring-new"
                    >
                        <ArrowRightCircle color="#2563EB" size={18} />
                        <Text style={styles.secondaryButtonText}>Schedule another</Text>
                    </TouchableOpacity>
                </View>

                {CTA !== null ? CTA : null}

                {mapped.length > 0 ? (
                    <View style={styles.listContainer} testID="recurring-list">
                        {mapped.map((item: any) => {
                            const CategoryIconComponent = getCategoryIconComponent(item.categoryIcon);
                            return (
                                <View key={item.id} style={styles.planCard}>
                                    <View style={styles.planHeader}>
                                        <View style={styles.planTitleGroup}>
                                            <View style={styles.planIconBadge}>
                                                <CategoryIconComponent color={item.type === "income" ? "#10B981" : "#EF4444"} size={20} />
                                            </View>
                                            <View style={styles.planTexts}>
                                                <Text style={styles.planTitle}>{item.categoryName}</Text>
                                                <Text style={styles.planSubtitle}>{formatFrequency(item)}</Text>
                                            </View>
                                        </View>
                                        <Switch
                                            value={item.isActive}
                                            onValueChange={(value) => handleToggle(item, value)}
                                            trackColor={{ true: "#22C55E", false: "#CBD5F5" }}
                                            thumbColor={item.isActive ? "#FFFFFF" : "#F9FAFB"}
                                            testID={`toggle-${item.id}`}
                                        />
                                    </View>

                                    <View style={styles.planMetaRow}>
                                        <Text style={styles.planAmount}>
                                            {item.type === "income" ? "+" : "-"}${item.amount.toFixed(2)}
                                        </Text>
                                        <Text style={styles.planMeta}>• {item.accountName}</Text>
                                    </View>

                                    <View style={styles.planInfoRow}>
                                        <CalendarClock color="#64748B" size={16} />
                                        <Text style={styles.planInfoText}>Next: {renderNextRun(item)}</Text>
                                    </View>

                                    {item.note ? (
                                        <Text style={styles.planNote}>{item.note}</Text>
                                    ) : null}

                                    <View style={styles.planActions}>
                                        <TouchableOpacity
                                            style={styles.planActionButton}
                                            onPress={() => openEditModal(item)}
                                            testID={`edit-${item.id}`}
                                        >
                                            <Pencil color="#2563EB" size={16} />
                                            <Text style={styles.planActionText}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.planActionButton}
                                            onPress={() => handleDelete(item)}
                                            testID={`delete-${item.id}`}
                                        >
                                            <Trash2 color="#EF4444" size={16} />
                                            <Text style={[styles.planActionText, styles.planActionTextDanger]}>Delete</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.planActionButton}
                                            onPress={() => handleToggle(item, !item.isActive)}
                                            testID={`toggle-quick-${item.id}`}
                                        >
                                            <Power color="#64748B" size={16} />
                                            <Text style={styles.planActionText}>{item.isActive ? "Pause" : "Resume"}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : null}
            </ScrollView>

            <Modal visible={Boolean(editing)} transparent animationType="slide" onRequestClose={closeEditModal}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit recurring plan</Text>
                            <TouchableOpacity style={styles.modalCloseButton} onPress={closeEditModal}>
                                <ChevronLeft color="#6B7280" size={20} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalField}>
                            <Text style={styles.modalLabel}>Amount</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={amountInput}
                                onChangeText={(value) => {
                                    setAmountInput(value.replace(/[^0-9.]/g, ""));
                                    setError("");
                                }}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                            />
                        </View>

                        <View style={styles.modalField}>
                            <Text style={styles.modalLabel}>Frequency</Text>
                            <View style={styles.modalOptionRow}>
                                {(["daily", "weekly", "monthly", "yearly"] as RecurringTransaction["repeatInterval"][]).map((option) => {
                                    const active = repeatInterval === option;
                                    return (
                                        <TouchableOpacity
                                            key={option}
                                            style={[styles.modalOptionPill, active && styles.modalOptionPillActive]}
                                            onPress={() => {
                                                hapticSelection();
                                                setRepeatInterval(option);
                                                if (option !== "monthly") {
                                                    setRepeatDay(null);
                                                }
                                                setError("");
                                            }}
                                        >
                                            <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>
                                                {option.charAt(0).toUpperCase() + option.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {repeatInterval === "monthly" ? (
                            <View style={styles.modalField}>
                                <Text style={styles.modalLabel}>Day of month</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={repeatDay === null ? "" : String(repeatDay)}
                                    onChangeText={(value) => {
                                        const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
                                        if (Number.isNaN(parsed)) {
                                            setRepeatDay(null);
                                        } else {
                                            setRepeatDay(Math.min(Math.max(parsed, 1), 31));
                                        }
                                        setError("");
                                    }}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    placeholder="1"
                                />
                            </View>
                        ) : null}

                        <View style={styles.modalField}>
                            <Text style={styles.modalLabel}>Ends</Text>
                            <View style={styles.modalOptionRow}>
                                {(["never", "endDate", "occurrences"] as RecurringTransaction["endType"][]).map((option) => {
                                    const active = endType === option;
                                    return (
                                        <TouchableOpacity
                                            key={option}
                                            style={[styles.modalOptionPill, active && styles.modalOptionPillActive]}
                                            onPress={() => {
                                                hapticSelection();
                                                setEndType(option);
                                                if (option !== "endDate") {
                                                    setEndDateValue(null);
                                                }
                                                if (option !== "occurrences") {
                                                    setOccurrenceCount("");
                                                }
                                                setError("");
                                            }}
                                        >
                                            <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>
                                                {option === "never" ? "Never" : option === "endDate" ? "On date" : "After"}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {endType === "endDate" ? (
                            <View style={styles.modalField}>
                                <TouchableOpacity
                                    style={styles.modalDateButton}
                                    onPress={() => setShowEndDatePicker(true)}
                                >
                                    <CalendarClock color="#2563EB" size={18} />
                                    <Text style={styles.modalDateText}>
                                        {endDateValue
                                            ? endDateValue.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                            : "Pick a date"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        {endType === "occurrences" ? (
                            <View style={styles.modalField}>
                                <TextInput
                                    style={styles.modalInput}
                                    value={occurrenceCount}
                                    onChangeText={(value) => {
                                        setOccurrenceCount(value.replace(/[^0-9]/g, "").slice(0, 3));
                                        setError("");
                                    }}
                                    keyboardType="number-pad"
                                    placeholder="e.g. 12"
                                />
                            </View>
                        ) : null}

                        <View style={styles.modalField}>
                            <Text style={styles.modalLabel}>Note</Text>
                            <TextInput
                                style={[styles.modalInput, styles.modalTextarea]}
                                value={noteInput}
                                onChangeText={(value) => {
                                    setNoteInput(value);
                                    setError("");
                                }}
                                placeholder="Optional memo"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {error ? <Text style={styles.modalError}>{error}</Text> : null}

                        <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleUpdate}>
                            <Text style={styles.modalPrimaryText}>Save changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {showEndDatePicker && editing ? (
                <DateTimePicker
                    value={endDateValue ?? new Date(editing.startDate)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                        setShowEndDatePicker(Platform.OS === "ios");
                        if (selectedDate) {
                            setEndDateValue(selectedDate);
                            setError("");
                        }
                    }}
                    minimumDate={new Date(editing.startDate)}
                />
            ) : null}
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
        fontSize: 30,
        fontWeight: "700" as const,
        color: "#0F172A",
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#64748B",
    },
    summaryCard: {
        backgroundColor: "#1D4ED8",
        borderRadius: 24,
        padding: 20,
        gap: 18,
        shadowColor: "#1D4ED8",
        shadowOpacity: 0.25,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    summaryPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    summaryPillText: {
        color: "#FFFFFF",
        fontWeight: "600" as const,
    },
    syncButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FFFFFF",
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    syncText: {
        color: "#2563EB",
        fontWeight: "600" as const,
    },
    summaryStatsRow: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: 16,
    },
    summaryStat: {
        flex: 1,
        alignItems: "center",
        gap: 4,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#FFFFFF",
    },
    summaryValueMuted: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: "rgba(255,255,255,0.7)",
    },
    summaryLabel: {
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
    },
    summaryDivider: {
        width: 1,
        backgroundColor: "rgba(255,255,255,0.25)",
    },
    secondaryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        paddingVertical: 12,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: "600" as const,
        color: "#2563EB",
    },
    primaryButton: {
        marginTop: 16,
        backgroundColor: "#2563EB",
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFFFFF",
    },
    emptyCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 28,
        alignItems: "center",
        gap: 16,
        shadowColor: "#0F172A",
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "700" as const,
        color: "#0F172A",
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#475569",
        textAlign: "center",
        lineHeight: 22,
    },
    listContainer: {
        gap: 18,
    },
    planCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 18,
        gap: 14,
        shadowColor: "#0F172A",
        shadowOpacity: 0.05,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
    },
    planHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    planTitleGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    planIconBadge: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "#EEF2FF",
        alignItems: "center",
        justifyContent: "center",
    },
    planTexts: {
        flex: 1,
        gap: 2,
    },
    planTitle: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#111827",
    },
    planSubtitle: {
        fontSize: 13,
        color: "#64748B",
    },
    planMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    planAmount: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#0F172A",
    },
    planMeta: {
        fontSize: 13,
        color: "#6B7280",
    },
    planInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    planInfoText: {
        fontSize: 13,
        color: "#475569",
    },
    planNote: {
        fontSize: 13,
        color: "#4B5563",
        backgroundColor: "#F8FAFC",
        padding: 12,
        borderRadius: 12,
    },
    planActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    planActionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    planActionText: {
        fontSize: 13,
        fontWeight: "600" as const,
        color: "#2563EB",
    },
    planActionTextDanger: {
        color: "#EF4444",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        gap: 18,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#111827",
    },
    modalCloseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F1F5F9",
    },
    modalField: {
        gap: 8,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#475569",
        textTransform: "uppercase" as const,
        letterSpacing: 0.6,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: "#0F172A",
        backgroundColor: "#F8FAFC",
    },
    modalTextarea: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    modalOptionRow: {
        flexDirection: "row",
        flexWrap: "wrap" as const,
        gap: 8,
    },
    modalOptionPill: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#FFFFFF",
    },
    modalOptionPillActive: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB",
    },
    modalOptionText: {
        fontSize: 13,
        fontWeight: "600" as const,
        color: "#475569",
    },
    modalOptionTextActive: {
        color: "#FFFFFF",
    },
    modalDateButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: "#EEF2FF",
        borderRadius: 12,
    },
    modalDateText: {
        fontSize: 15,
        fontWeight: "600" as const,
        color: "#1D4ED8",
    },
    modalError: {
        fontSize: 14,
        color: "#EF4444",
    },
    modalPrimaryButton: {
        backgroundColor: "#2563EB",
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: "center",
    },
    modalPrimaryText: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFFFFF",
    },
});
