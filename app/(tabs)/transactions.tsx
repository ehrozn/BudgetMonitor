import { useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Calendar, Search, Filter, X, TrendingUp, TrendingDown, Edit2, Trash2 } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useApp, useCurrentAccount, usePeriodDates } from "../../context/AppContext";
import { PeriodType, TransactionType } from "../../types";
import { hapticSelection, hapticLight, hapticSuccess } from "../../utils/haptics";


export default function TransactionsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { getTransactionsByAccountAndPeriod, categories, settings, updateSettings, deleteTransaction } = useApp();
    const currentAccount = useCurrentAccount();

    const [periodType, setPeriodType] = useState<PeriodType>(
        settings.lastSelectedPeriodType as PeriodType
    );
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [selectedType, setSelectedType] = useState<TransactionType | "all">("all");
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

    const { from, to } = usePeriodDates(periodType);

    const allTransactions = useMemo(() => {
        if (!currentAccount) return [];
        return getTransactionsByAccountAndPeriod(currentAccount.id, from, to);
    }, [currentAccount, from, to, getTransactionsByAccountAndPeriod]);

    const transactions = useMemo(() => {
        let filtered = allTransactions;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((t) => {
                const category = categories.find((c) => c.id === t.categoryId);
                const categoryName = (t.customCategoryName || category?.name || "").toLowerCase();
                const note = (t.note || "").toLowerCase();
                return categoryName.includes(query) || note.includes(query);
            });
        }

        if (selectedType !== "all") {
            filtered = filtered.filter((t) => t.type === selectedType);
        }

        if (selectedCategoryIds.length > 0) {
            filtered = filtered.filter((t) => selectedCategoryIds.includes(t.categoryId));
        }

        return filtered;
    }, [allTransactions, searchQuery, selectedType, selectedCategoryIds, categories]);

    const handlePeriodChange = (type: PeriodType) => {
        hapticSelection();
        setPeriodType(type);
        updateSettings({ lastSelectedPeriodType: type });
    };

    const handleCategoryToggle = (categoryId: string) => {
        hapticSelection();
        setSelectedCategoryIds((prev) =>
            prev.includes(categoryId)
                ? prev.filter((id) => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const handleResetFilters = () => {
        hapticLight();
        setSelectedType("all");
        setSelectedCategoryIds([]);
        setSearchQuery("");
        setShowFilters(false);
    };

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedType !== "all") count++;
        if (selectedCategoryIds.length > 0) count += selectedCategoryIds.length;
        if (searchQuery.trim()) count++;
        return count;
    }, [selectedType, selectedCategoryIds, searchQuery]);

    const formatCurrency = (amount: number) => {
        return `${amount.toFixed(2)}`;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const groupedTransactions = useMemo(() => {
        const groups: Record<string, typeof transactions> = {};
        transactions.forEach((t) => {
            const date = new Date(t.date).toDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(t);
        });
        return groups;
    }, [transactions]);

    const periodDurationDays = useMemo(() => {
        const durationMs = Math.max(0, to.getTime() - from.getTime());
        const days = Math.max(1, Math.ceil(durationMs / 86400000) + 1);
        return days;
    }, [from, to]);

    const periodTotals = useMemo(() => {
        return transactions.reduce(
            (acc, txn) => {
                if (txn.type === "income") {
                    acc.income += txn.amount;
                    acc.net += txn.amount;
                } else {
                    acc.expenses += txn.amount;
                    acc.net -= txn.amount;
                }
                return acc;
            },
            { income: 0, expenses: 0, net: 0 },
        );
    }, [transactions]);

    const budgetUtilization = useMemo(() => {
        if (periodTotals.income <= 0) {
            return 0;
        }
        return Math.min(1, periodTotals.expenses / periodTotals.income);
    }, [periodTotals]);

    const topSpendingCategory = useMemo(() => {
        const expenseMap = transactions.reduce<Record<string, number>>((acc, txn) => {
            if (txn.type !== "expense") {
                return acc;
            }
            const category = categories.find((c) => c.id === txn.categoryId);
            const label = txn.customCategoryName || category?.name || "Other";
            acc[label] = (acc[label] ?? 0) + txn.amount;
            return acc;
        }, {});
        const sorted = Object.entries(expenseMap).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) {
            return null;
        }
        const [name, total] = sorted[0];
        return { name, total };
    }, [transactions, categories]);

    const budgetPercentage = periodTotals.income > 0 ? Math.round(budgetUtilization * 100) : 0;
    const budgetLabel = periodTotals.income > 0 ? `${budgetPercentage}%` : "—";
    const averageDailySpend = Number.isFinite(periodTotals.expenses / periodDurationDays)
        ? periodTotals.expenses / periodDurationDays
        : 0;
    const avgSpendDisplay = "$" + averageDailySpend.toFixed(2);
    const netDisplay = (periodTotals.net >= 0 ? "+" : "-") + "$" + Math.abs(periodTotals.net).toFixed(2);
    const topCategoryDisplay = topSpendingCategory
        ? topSpendingCategory.name + " • $" + topSpendingCategory.total.toFixed(2)
        : "—";

    if (!currentAccount) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Text style={styles.noAccount}>No account found. Please create one.</Text>
            </View>
        );
    }

    const periodButtons: { type: PeriodType; label: string }[] = [
        { type: "day", label: "Day" },
        { type: "week", label: "Week" },
        { type: "month", label: "Month" },
        { type: "year", label: "Year" },
    ];

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Transactions</Text>
                    <Text style={styles.subtitle}>
                        {currentAccount.name} • {formatCurrency(currentAccount.currentBalance)}
                    </Text>
                </View>

                <View style={styles.insightsWrapper}>
                    <LinearGradient
                        colors={periodTotals.net >= 0 ? ["#0EA5E9", "#2563EB"] : ["#F97316", "#EA580C"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.insightsCard}
                        testID="transactions-insights-card"
                    >
                        <View style={styles.insightHeader}>
                            <Text style={styles.insightTitle}>Period insights</Text>
                            <View
                                style={[
                                    styles.netPill,
                                    periodTotals.net >= 0 ? styles.netPillPositive : styles.netPillNegative,
                                ]}
                            >
                                <Text style={styles.netPillText}>
                                    {periodTotals.net >= 0 ? "Net gain" : "Net burn"}
                                </Text>
                                <Text style={styles.netPillValue}>{netDisplay}</Text>
                            </View>
                        </View>

                        <View style={styles.insightRow}>
                            <View style={styles.insightStat}>
                                <View style={styles.insightIcon}>
                                    <TrendingUp color="#34D399" size={18} />
                                </View>
                                <Text style={styles.insightLabel}>Income</Text>
                                <Text style={styles.insightValue}>${periodTotals.income.toFixed(2)}</Text>
                            </View>
                            <View style={styles.insightStat}>
                                <View style={styles.insightIcon}>
                                    <TrendingDown color="#FCA5A5" size={18} />
                                </View>
                                <Text style={styles.insightLabel}>Expenses</Text>
                                <Text style={styles.insightValue}>${periodTotals.expenses.toFixed(2)}</Text>
                            </View>
                        </View>

                        <View style={styles.utilizationHeader}>
                            <Text style={styles.utilizationLabel}>Budget usage</Text>
                            <Text style={styles.utilizationValue}>{budgetLabel}</Text>
                        </View>
                        <View style={styles.utilizationTrack}>
                            <View
                                style={[styles.utilizationFill, { width: `${budgetPercentage}%` }]}
                            />
                        </View>

                        <View style={styles.metaRow}>
                            <View style={styles.metaBlock}>
                                <Text style={styles.metaLabel}>Avg. spend / day</Text>
                                <Text style={styles.metaValue}>{avgSpendDisplay}</Text>
                            </View>
                            <View style={styles.metaDivider} />
                            <View style={styles.metaBlock}>
                                <Text style={styles.metaLabel}>Top category</Text>
                                <Text style={styles.metaValue} numberOfLines={1}>
                                    {topCategoryDisplay}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Search color="#9CA3AF" size={20} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search transactions..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery ? (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <X color="#9CA3AF" size={20} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            activeFiltersCount > 0 && styles.filterButtonActive,
                        ]}
                        onPress={() => {
                            hapticLight();
                            setShowFilters(true);
                        }}
                    >
                        <Filter color={activeFiltersCount > 0 ? "#FFF" : "#6B7280"} size={20} />
                        {activeFiltersCount > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.periodSelector}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.periodButtons}
                    >
                        {periodButtons.map((button) => (
                            <TouchableOpacity
                                key={button.type}
                                style={[
                                    styles.periodButton,
                                    periodType === button.type && styles.periodButtonActive,
                                ]}
                                onPress={() => handlePeriodChange(button.type)}
                            >
                                <Text
                                    style={[
                                        styles.periodButtonText,
                                        periodType === button.type && styles.periodButtonTextActive,
                                    ]}
                                >
                                    {button.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    {Object.keys(groupedTransactions).length === 0 ? (
                        <View style={styles.emptyState}>
                            <Calendar color="#9CA3AF" size={48} />
                            <Text style={styles.emptyStateText}>
                                {searchQuery || activeFiltersCount > 0
                                    ? "No matching transactions found"
                                    : "No transactions for this period"}
                            </Text>
                            <Text style={styles.emptyStateSubtext}>
                                {searchQuery || activeFiltersCount > 0
                                    ? "Try adjusting your search or filters"
                                    : "Add transactions from the home screen"}
                            </Text>
                        </View>
                    ) : (
                        Object.entries(groupedTransactions).map(([date, dateTransactions]) => (
                            <View key={date} style={styles.dateGroup}>
                                <Text style={styles.dateHeader}>
                                    {new Date(date).toLocaleDateString("en-US", {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </Text>
                                {dateTransactions.map((transaction) => {
                                    const category = categories.find((c) => c.id === transaction.categoryId);
                                    const categoryName = transaction.customCategoryName || category?.name || "Other";
                                    const displayName = transaction.transactionName || categoryName;

                                    return (
                                        <View key={transaction.id} style={styles.transactionItem}>
                                            <View style={styles.transactionInfo}>
                                                <Text style={styles.transactionCategory}>{displayName}</Text>
                                                <View style={styles.transactionMeta}>
                                                    <Text style={styles.transactionTime}>{formatTime(transaction.date)}</Text>
                                                    <Text style={styles.transactionNote} numberOfLines={1}>
                                                        • {categoryName}
                                                    </Text>
                                                    {transaction.note && (
                                                        <Text style={styles.transactionNote} numberOfLines={1}>
                                                            • {transaction.note}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                            <View style={styles.transactionRight}>
                                                <Text
                                                    style={[
                                                        styles.transactionAmount,
                                                        transaction.type === "income"
                                                            ? styles.transactionAmountIncome
                                                            : styles.transactionAmountExpense,
                                                    ]}
                                                >
                                                    {transaction.type === "income" ? "+" : "-"}
                                                    {formatCurrency(transaction.amount)}
                                                </Text>
                                                {!transaction.isTransfer && (
                                                    <View style={styles.transactionActions}>
                                                        <TouchableOpacity
                                                            style={styles.actionButtonSmall}
                                                            onPress={() => {
                                                                hapticLight();
                                                                router.push({
                                                                    pathname: "/edit-transaction",
                                                                    params: { id: transaction.id },
                                                                });
                                                            }}
                                                        >
                                                            <Edit2 color="#3B82F6" size={16} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={styles.actionButtonSmall}
                                                            onPress={() => {
                                                                hapticLight();
                                                                Alert.alert(
                                                                    "Delete Transaction",
                                                                    "Are you sure you want to delete this transaction?",
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
                                                                                hapticSuccess();
                                                                            },
                                                                        },
                                                                    ]
                                                                );
                                                            }}
                                                        >
                                                            <Trash2 color="#EF4444" size={16} />
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            <Modal
                visible={showFilters}
                animationType="slide"
                transparent
                onRequestClose={() => setShowFilters(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filters</Text>
                            <TouchableOpacity onPress={() => setShowFilters(false)}>
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Transaction Type</Text>
                            <View style={styles.typeFilters}>
                                {["all", "income", "expense"].map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.typeFilter,
                                            selectedType === type && styles.typeFilterActive,
                                        ]}
                                        onPress={() => {
                                            hapticSelection();
                                            setSelectedType(type as TransactionType | "all");
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.typeFilterText,
                                                selectedType === type && styles.typeFilterTextActive,
                                            ]}
                                        >
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Categories</Text>
                            <ScrollView style={styles.categoryFiltersList}>
                                {categories
                                    .filter((c) => selectedType === "all" || c.type === selectedType)
                                    .map((category) => (
                                        <TouchableOpacity
                                            key={category.id}
                                            style={[
                                                styles.categoryFilter,
                                                selectedCategoryIds.includes(category.id) &&
                                                styles.categoryFilterActive,
                                            ]}
                                            onPress={() => handleCategoryToggle(category.id)}
                                        >
                                            <Text
                                                style={[
                                                    styles.categoryFilterText,
                                                    selectedCategoryIds.includes(category.id) &&
                                                    styles.categoryFilterTextActive,
                                                ]}
                                            >
                                                {category.name}
                                            </Text>
                                            {selectedCategoryIds.includes(category.id) && (
                                                <View style={styles.checkmark} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.resetButton}
                                onPress={handleResetFilters}
                            >
                                <Text style={styles.resetButtonText}>Reset All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={() => {
                                    hapticSuccess();
                                    setShowFilters(false);
                                }}
                            >
                                <Text style={styles.applyButtonText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        padding: 20,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: "700" as const,
        color: "#111827",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: "#6B7280",
    },
    periodSelector: {
        marginBottom: 24,
    },
    periodButtons: {
        gap: 8,
    },
    periodButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#FFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    periodButtonActive: {
        backgroundColor: "#3B82F6",
        borderColor: "#3B82F6",
    },
    periodButtonText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    periodButtonTextActive: {
        color: "#FFF",
    },
    section: {
        gap: 24,
    },
    insightsWrapper: {
        marginBottom: 24,
    },
    insightsCard: {
        borderRadius: 24,
        padding: 20,
    },
    insightHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    insightTitle: {
        fontSize: 13,
        fontWeight: "600" as const,
        color: "rgba(248,250,252,0.85)",
        letterSpacing: 0.8,
        textTransform: "uppercase" as const,
    },
    netPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    netPillPositive: {
        backgroundColor: "rgba(16,185,129,0.25)",
    },
    netPillNegative: {
        backgroundColor: "rgba(248,113,113,0.25)",
    },
    netPillText: {
        fontSize: 12,
        color: "#F8FAFC",
    },
    netPillValue: {
        fontSize: 14,
        fontWeight: "700" as const,
        color: "#FFF",
    },
    insightRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    insightStat: {
        flex: 1,
        backgroundColor: "rgba(15,23,42,0.24)",
        borderRadius: 20,
        padding: 16,
    },
    insightIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: "rgba(248,250,252,0.15)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    insightLabel: {
        fontSize: 12,
        color: "rgba(226,232,240,0.9)",
        marginBottom: 4,
    },
    insightValue: {
        fontSize: 22,
        fontWeight: "700" as const,
        color: "#FFF",
    },
    utilizationHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    utilizationLabel: {
        fontSize: 12,
        color: "rgba(241,245,249,0.8)",
        letterSpacing: 0.8,
        textTransform: "uppercase" as const,
    },
    utilizationValue: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFF",
    },
    utilizationTrack: {
        height: 8,
        borderRadius: 999,
        backgroundColor: "rgba(15,23,42,0.45)",
        overflow: "hidden",
    },
    utilizationFill: {
        height: "100%",
        borderRadius: 999,
        backgroundColor: "#FDE68A",
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 16,
    },
    metaBlock: {
        flex: 1,
    },
    metaLabel: {
        fontSize: 12,
        color: "rgba(226,232,240,0.75)",
        marginBottom: 6,
    },
    metaValue: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#FFF",
    },
    metaDivider: {
        width: 1,
        height: 40,
        backgroundColor: "rgba(226,232,240,0.35)",
        marginHorizontal: 16,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        gap: 12,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: "600" as const,
        color: "#6B7280",
        textAlign: "center",
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
    },
    dateGroup: {
        gap: 8,
    },
    dateHeader: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7280",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    transactionItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFF",
        padding: 16,
        borderRadius: 12,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionCategory: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#111827",
        marginBottom: 4,
    },
    transactionMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    transactionTime: {
        fontSize: 14,
        color: "#9CA3AF",
    },
    transactionNote: {
        fontSize: 14,
        color: "#9CA3AF",
        flex: 1,
    },
    transactionRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    transactionAmount: {
        fontSize: 18,
        fontWeight: "700" as const,
    },
    transactionActions: {
        flexDirection: "row",
        gap: 8,
    },
    actionButtonSmall: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    transactionAmountIncome: {
        color: "#10B981",
    },
    transactionAmountExpense: {
        color: "#EF4444",
    },
    noAccount: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
    },
    searchContainer: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16,
    },
    searchBar: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: 12,
        paddingHorizontal: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: "#111827",
    },
    filterButton: {
        width: 48,
        height: 48,
        backgroundColor: "#FFF",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        position: "relative" as const,
    },
    filterButtonActive: {
        backgroundColor: "#3B82F6",
    },
    filterBadge: {
        position: "absolute" as const,
        top: 4,
        right: 4,
        backgroundColor: "#EF4444",
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    filterBadgeText: {
        fontSize: 10,
        fontWeight: "700" as const,
        color: "#FFF",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#111827",
    },
    filterSection: {
        marginBottom: 24,
    },
    filterSectionTitle: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7280",
        marginBottom: 12,
        textTransform: "uppercase" as const,
    },
    typeFilters: {
        flexDirection: "row",
        gap: 8,
    },
    typeFilter: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: "#F9FAFB",
        borderWidth: 2,
        borderColor: "#E5E7EB",
        alignItems: "center",
    },
    typeFilterActive: {
        backgroundColor: "#EFF6FF",
        borderColor: "#3B82F6",
    },
    typeFilterText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    typeFilterTextActive: {
        color: "#3B82F6",
    },
    categoryFiltersList: {
        maxHeight: 200,
    },
    categoryFilter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 4,
    },
    categoryFilterActive: {
        backgroundColor: "#EFF6FF",
    },
    categoryFilterText: {
        fontSize: 16,
        color: "#374151",
    },
    categoryFilterTextActive: {
        color: "#3B82F6",
        fontWeight: "600" as const,
    },
    checkmark: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#3B82F6",
    },
    modalButtons: {
        flexDirection: "row",
        gap: 12,
        marginTop: 8,
    },
    resetButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: "#F9FAFB",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    applyButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: "#3B82F6",
        alignItems: "center",
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#FFF",
    },
});
