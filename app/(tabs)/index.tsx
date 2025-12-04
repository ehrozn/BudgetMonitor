import { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  X,
  ArrowLeftRight,
  Sparkles,
  CalendarDays,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

// Adjusted imports to relative paths
import ExpenseChart from "../../components/ExpenseChart";
import { useApp, useCurrentAccount, usePeriodDates } from "../../context/AppContext";
import { PeriodType } from "../../types";
import { hapticSelection, hapticLight } from "../../utils/haptics";



const formatCurrency = (amount: number): string => {
  return "$" + amount.toFixed(2);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getActiveAccounts, updateSettings, settings, getPeriodStats, getTransactionsByAccountAndPeriod, categories, transferRules } = useApp();
  const currentAccount = useCurrentAccount();
  const activeAccounts = getActiveAccounts();

  const [periodType, setPeriodType] = useState<PeriodType>(
    settings.lastSelectedPeriodType as PeriodType
  );
  const [showAccountPicker, setShowAccountPicker] = useState<boolean>(false);
  const [showCustomPeriod, setShowCustomPeriod] = useState<boolean>(false);
  const [customFrom, setCustomFrom] = useState<Date>(new Date());
  const [customTo, setCustomTo] = useState<Date>(new Date());
  const [showFromPicker, setShowFromPicker] = useState<boolean>(false);
  const [showToPicker, setShowToPicker] = useState<boolean>(false);

  const animatedValue1 = useRef(new Animated.Value(0)).current;
  const animatedValue2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation1 = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue1, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue1, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    );

    const animation2 = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue2, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue2, {
          toValue: 0,
          duration: 10000,
          useNativeDriver: true,
        }),
      ])
    );

    animation1.start();
    animation2.start();

    return () => {
      animation1.stop();
      animation2.stop();
    };
  }, [animatedValue1, animatedValue2]);

  const translateX1 = animatedValue1.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 30],
  });

  const translateY1 = animatedValue1.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });

  const translateX2 = animatedValue2.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -20],
  });

  const translateY2 = animatedValue2.interpolate({
    inputRange: [0, 1],
    outputRange: [15, -15],
  });

  const defaultPeriod = usePeriodDates(periodType);
  const from = useMemo(() => {
    if (periodType === "custom" && settings.lastCustomPeriodFrom) {
      return new Date(settings.lastCustomPeriodFrom);
    }
    return defaultPeriod.from;
  }, [periodType, settings.lastCustomPeriodFrom, defaultPeriod.from]);

  const to = useMemo(() => {
    if (periodType === "custom" && settings.lastCustomPeriodTo) {
      return new Date(settings.lastCustomPeriodTo);
    }
    return defaultPeriod.to;
  }, [periodType, settings.lastCustomPeriodTo, defaultPeriod.to]);

  const stats = useMemo(() => {
    if (!currentAccount) return { income: 0, expenses: 0, balance: 0, expensesByCategory: {} };
    return getPeriodStats(currentAccount.id, from, to);
  }, [currentAccount, from, to, getPeriodStats]);

  const periodSummary = useMemo(() => {
    const durationMs = Math.max(0, to.getTime() - from.getTime());
    const durationDays = Math.max(1, Math.ceil(durationMs / 86400000) + 1);
    const includeYear = from.getFullYear() !== to.getFullYear();
    const baseOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const formatterOptions: Intl.DateTimeFormatOptions = includeYear
      ? { ...baseOptions, year: "numeric" }
      : baseOptions;
    const startLabel = from.toLocaleDateString("en-US", formatterOptions);
    const endLabel = to.toLocaleDateString("en-US", formatterOptions);
    const averageNetPerDay = durationDays > 0 ? stats.balance / durationDays : 0;
    const summary = {
      label: `${startLabel} • ${endLabel}`,
      durationDays,
      averageNetPerDay,
    };
    console.log("[HomeScreen] period summary", summary);
    return summary;
  }, [from, to, stats.balance]);

  const transactions = useMemo(() => {
    if (!currentAccount) return [];
    return getTransactionsByAccountAndPeriod(currentAccount.id, from, to);
  }, [currentAccount, from, to, getTransactionsByAccountAndPeriod]);

  type InsightTone = "positive" | "negative" | "neutral";

  interface InsightCard {
    id: string;
    label: string;
    title: string;
    description: string;
    caption?: string;
    tone: InsightTone;
  }

  const insightCards = useMemo<InsightCard[]>(() => {
    if (!currentAccount) {
      return [];
    }

    const cards: InsightCard[] = [];
    const netPace = periodSummary.averageNetPerDay;
    const netTone: InsightTone = netPace > 0 ? "positive" : netPace < 0 ? "negative" : "neutral";

    cards.push({
      id: "net-pace",
      label: "Net pace",
      title: `${netPace >= 0 ? "+" : "-"}${formatCurrency(Math.abs(netPace))}/day`,
      description: netPace >= 0 ? "Positive momentum" : "Over budget",
      caption: `${periodSummary.durationDays} day window`,
      tone: netTone,
    });

    const expenseEntries = Object.entries(stats.expensesByCategory ?? {});
    if (expenseEntries.length > 0) {
      const [topCategoryId, topAmount] = [...expenseEntries].sort((a, b) => b[1] - a[1])[0];
      const topCategoryName =
        categories.find((category) => category.id === topCategoryId)?.name || "Other";
      cards.push({
        id: "top-expense",
        label: "Top expense",
        title: formatCurrency(topAmount),
        description: topCategoryName,
        caption: "This period",
        tone: "negative",
      });
    }

    if (stats.income > 0) {
      const savingsRate = ((stats.income - stats.expenses) / stats.income) * 100;
      const tone: InsightTone = savingsRate >= 30 ? "positive" : savingsRate < 0 ? "negative" : "neutral";
      cards.push({
        id: "savings-rate",
        label: "Savings rate",
        title: `${Math.max(0, savingsRate).toFixed(0)}%`,
        description:
          savingsRate >= 0
            ? `${formatCurrency(Math.max(0, stats.income - stats.expenses))} saved`
            : "Overspending",
        caption: "vs income",
        tone,
      });
    }

    const lastIncome = [...transactions]
      .filter((transaction) => transaction.type === "income")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    cards.push({
      id: "last-income",
      label: "Last income",
      title: lastIncome ? `+${formatCurrency(lastIncome.amount)}` : "No income",
      description: lastIncome ? formatDate(lastIncome.date) : "Log income to unlock trends",
      caption: lastIncome?.note ?? undefined,
      tone: lastIncome ? "positive" : "neutral",
    });

    console.log("[HomeScreen] insights cards", cards);
    return cards;
  }, [currentAccount, periodSummary, stats, transactions, categories]);

  const smartTransferStats = useMemo(() => {
    if (transferRules.length === 0) {
      return { active: 0, percentageAverage: 0, fixedTotal: 0 };
    }

    const active = transferRules.filter((rule) => rule.isActive).length;
    const percentageRules = transferRules.filter(
      (rule) => rule.allocationType === "percentage" && (rule.percentage ?? 0) > 0,
    );
    const percentageAverage = percentageRules.length
      ? percentageRules.reduce((sum, rule) => sum + (rule.percentage ?? 0), 0) / percentageRules.length
      : 0;
    const fixedTotal = transferRules
      .filter((rule) => rule.allocationType === "fixed" && (rule.fixedAmount ?? 0) > 0)
      .reduce((sum, rule) => sum + (rule.fixedAmount ?? 0), 0);

    return { active, percentageAverage, fixedTotal };
  }, [transferRules]);

  const hasTransferAutomation = transferRules.length > 0;

  const handlePeriodChange = (type: PeriodType) => {
    hapticSelection();
    if (type === "custom") {
      setShowCustomPeriod(true);
    } else {
      setPeriodType(type);
      updateSettings({ lastSelectedPeriodType: type });
    }
  };

  const handleCustomPeriodSave = () => {
    if (customFrom > customTo) {
      return;
    }
    setPeriodType("custom");
    updateSettings({
      lastSelectedPeriodType: "custom",
      lastCustomPeriodFrom: customFrom.toISOString(),
      lastCustomPeriodTo: customTo.toISOString(),
    });
    setShowCustomPeriod(false);
  };

  const handleAccountChange = (accountId: string) => {
    hapticSelection();
    updateSettings({ lastSelectedAccountId: accountId });
    setShowAccountPicker(false);
  };

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
    { type: "custom", label: "Custom" },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#3B82F6", "#2563EB"]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Animated.View
          style={[
            styles.animatedCircle1,
            {
              transform: [{ translateX: translateX1 }, { translateY: translateY1 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.animatedCircle2,
            {
              transform: [{ translateX: translateX2 }, { translateY: translateY2 }],
            },
          ]}
        />
        <TouchableOpacity
          style={styles.accountSelector}
          onPress={() => {
            hapticLight();
            setShowAccountPicker(!showAccountPicker);
          }}
        >
          <View>
            <Text style={styles.accountLabel}>Current Account</Text>
            <Text style={styles.accountName}>{currentAccount.name}</Text>
          </View>
          <ChevronDown color="#FFF" size={24} />
        </TouchableOpacity>

        {showAccountPicker && activeAccounts.length > 1 && (
          <View style={styles.accountPicker}>
            {activeAccounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountOption,
                  account.id === currentAccount.id && styles.accountOptionActive,
                ]}
                onPress={() => handleAccountChange(account.id)}
              >
                <View style={styles.accountOptionContent}>
                  <Text
                    style={[
                      styles.accountOptionName,
                      account.id === currentAccount.id && styles.accountOptionNameActive,
                    ]}
                  >
                    {account.name}
                  </Text>
                  <Text
                    style={[
                      styles.accountOptionBalance,
                      account.id === currentAccount.id && styles.accountOptionBalanceActive,
                    ]}
                  >
                    {formatCurrency(account.currentBalance)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.contentWrapper}>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balance}>{formatCurrency(currentAccount.currentBalance)}</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <TrendingUp color="#10B981" size={18} />
              </View>
              <Text style={styles.statLabel}>Income</Text>
              <Text style={styles.statValue}>{formatCurrency(stats.income)}</Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <TrendingDown color="#EF4444" size={18} />
              </View>
              <Text style={styles.statLabel}>Expenses</Text>
              <Text style={styles.statValue}>{formatCurrency(stats.expenses)}</Text>
            </View>
          </View>

          {stats.balance !== 0 && (
            <View style={[
              styles.netBalanceContainer,
              stats.balance >= 0 ? styles.netBalancePositive : styles.netBalanceNegative
            ]}>
              <Text style={styles.netBalanceLabel}>
                {stats.balance >= 0 ? "Net Income" : "Net Loss"}
              </Text>
              <Text style={styles.netBalanceValue}>
                {stats.balance >= 0 ? "+" : ""}{formatCurrency(Math.abs(stats.balance))}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 160 },
        ]}
        showsVerticalScrollIndicator={false}
        testID="home-scroll-container"
      >
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

        <View style={styles.periodSummaryCard} testID="period-summary-card">
          <LinearGradient
            colors={["#0EA5E9", "#6366F1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.periodSummaryGradient}
          >
            <View style={styles.periodSummaryHeader}>
              <View style={styles.periodSummaryIcon}>
                <CalendarDays color="#F8FAFC" size={22} />
              </View>
              <View style={styles.periodSummaryTextWrapper}>
                <Text style={styles.periodSummaryLabel}>Current window</Text>
                <Text style={styles.periodSummaryRange}>{periodSummary.label}</Text>
              </View>
            </View>
            <View style={styles.periodSummaryMetaRow}>
              <View style={styles.periodSummaryMeta}>
                <Text style={styles.periodSummaryMetaLabel}>Duration</Text>
                <Text style={styles.periodSummaryMetaValue}>{`${periodSummary.durationDays} days`}</Text>
              </View>
              <View style={styles.periodSummaryDivider} />
              <View style={styles.periodSummaryMeta}>
                <Text style={styles.periodSummaryMetaLabel}>Avg. net / day</Text>
                <Text
                  style={[
                    styles.periodSummaryMetaValue,
                    periodSummary.averageNetPerDay >= 0
                      ? styles.periodSummaryPositive
                      : styles.periodSummaryNegative,
                  ]}
                >
                  {`${periodSummary.averageNetPerDay >= 0 ? "+" : "-"}${formatCurrency(Math.abs(periodSummary.averageNetPerDay))}`}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {insightCards.length > 0 && (
          <View style={styles.insightsSection}>
            <View style={styles.insightsHeader}>
              <Text style={styles.insightsTitle}>Insights</Text>
              <View style={styles.insightsBadge}>
                <Sparkles color="#059669" size={16} />
                <Text style={styles.insightsBadgeText}>Live</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.insightsCarousel}
              testID="insights-scroll"
            >
              {insightCards.map((card) => {
                const gradientColors: [string, string] =
                  card.tone === "positive"
                    ? ["#22C55E", "#15803D"]
                    : card.tone === "negative"
                      ? ["#F97316", "#B91C1C"]
                      : ["#1F2937", "#0F172A"];

                return (
                  <LinearGradient
                    key={card.id}
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.insightCard}
                    testID={`insight-card-${card.id}`}
                  >
                    <Text style={styles.insightLabel}>{card.label}</Text>
                    <Text style={styles.insightValue}>{card.title}</Text>
                    <Text style={styles.insightDescription}>{card.description}</Text>
                    {card.caption ? (
                      <Text style={styles.insightCaption}>{card.caption}</Text>
                    ) : null}
                  </LinearGradient>
                );
              })}
            </ScrollView>
          </View>
        )}

        {Object.keys(stats.expensesByCategory).length > 0 && (
          <View style={styles.chartSection}>
            <ExpenseChart
              expensesByCategory={stats.expensesByCategory}
              currency="$"
            />
          </View>
        )}

        <View style={styles.smartCard} testID="smart-transfers-card">
          <View style={styles.smartHeader}>
            <View style={styles.smartIcon}>
              <Sparkles color="#FDE68A" size={20} />
            </View>
            <View style={styles.smartHeaderText}>
              <Text style={styles.smartTitle}>Smart transfers</Text>
              <Text style={styles.smartSubtitle}>
                {hasTransferAutomation
                  ? "Income skims are running in the background"
                  : "Auto-route a slice of every income into goals"}
              </Text>
            </View>
          </View>

          {hasTransferAutomation ? (
            <View style={styles.smartStatsRow}>
              <View style={styles.smartStat}>
                <Text style={styles.smartStatLabel}>Active rules</Text>
                <Text style={styles.smartStatValue}>{smartTransferStats.active}</Text>
              </View>
              <View style={styles.smartStatDivider} />
              <View style={styles.smartStat}>
                <Text style={styles.smartStatLabel}>Avg. skim</Text>
                <Text style={styles.smartStatValue}>{`${smartTransferStats.percentageAverage.toFixed(1)}%`}</Text>
              </View>
              <View style={styles.smartStatDivider} />
              <View style={styles.smartStat}>
                <Text style={styles.smartStatLabel}>Fixed total</Text>
                <Text style={styles.smartStatValue}>{formatCurrency(smartTransferStats.fixedTotal)}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.smartCardEmptyText}>
              No automations yet. Protect savings every time you log income.
            </Text>
          )}

          <TouchableOpacity
            style={styles.smartCardButton}
            onPress={() => {
              hapticLight();
              router.push("/transfer-automation");
            }}
            testID="smart-transfers-manage"
          >
            <Text style={styles.smartCardButtonText}>
              {hasTransferAutomation ? "Manage rules" : "Set up automations"}
            </Text>
          </TouchableOpacity>
        </View>

        {transactions.length > 0 && (
          <View style={styles.quickStatsCard}>
            <Text style={styles.quickStatsTitle}>Quick Stats</Text>
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatLabel}>Transactions</Text>
                <Text style={styles.quickStatValue}>{transactions.length}</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatLabel}>Average</Text>
                <Text style={styles.quickStatValue}>
                  {formatCurrency(
                    transactions.length > 0
                      ? (stats.income + stats.expenses) / transactions.length
                      : 0
                  )}
                </Text>
              </View>
              {stats.expenses > 0 && (
                <>
                  <View style={styles.quickStatDivider} />
                  <View style={styles.quickStatItem}>
                    <Text style={styles.quickStatLabel}>Savings Rate</Text>
                    <Text
                      style={[
                        styles.quickStatValue,
                        stats.income > 0 && ((stats.income - stats.expenses) / stats.income) > 0
                          ? styles.quickStatValuePositive
                          : styles.quickStatValueNegative,
                      ]}
                    >
                      {stats.income > 0
                        ? `${(((stats.income - stats.expenses) / stats.income) * 100).toFixed(0)}%`
                        : "0%"}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions for this period</Text>
              <Text style={styles.emptyStateSubtext}>Add your first transaction to get started</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map((transaction) => {
                const category = categories.find((c) => c.id === transaction.categoryId);
                const categoryName = transaction.customCategoryName || category?.name || "Other";

                return (
                  <TouchableOpacity
                    key={transaction.id}
                    style={styles.transactionItem}
                    onPress={() => {
                      hapticLight();
                      router.push({
                        pathname: "/edit-transaction",
                        params: { id: transaction.id },
                      });
                    }}
                  >
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionCategory}>{categoryName}</Text>
                      <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                    </View>
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
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.actionButtons, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.incomeButton]}
          onPress={() => {
            hapticLight();
            router.push({
              pathname: "/add-transaction",
              params: { type: "income" },
            });
          }}
          testID="home-income-action"
        >
          <Plus color="#FFF" size={24} />
          <Text style={styles.actionButtonText}>Income</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.transferButton]}
          onPress={() => {
            hapticLight();
            router.push("/transfer");
          }}
          testID="home-transfer-action"
        >
          <ArrowLeftRight color="#FFF" size={24} />
          <Text style={styles.actionButtonText}>Transfer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.expenseButton]}
          onPress={() => {
            hapticLight();
            router.push({
              pathname: "/add-transaction",
              params: { type: "expense" },
            });
          }}
          testID="home-expense-action"
        >
          <Minus color="#FFF" size={24} />
          <Text style={styles.actionButtonText}>Expense</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showCustomPeriod}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCustomPeriod(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Period</Text>
              <TouchableOpacity onPress={() => setShowCustomPeriod(false)}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>From</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowFromPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {customFrom.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>To</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowToPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {customTo.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {showFromPicker && (
              <DateTimePicker
                value={customFrom}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedDate) => {
                  setShowFromPicker(Platform.OS === "ios");
                  if (selectedDate) {
                    setCustomFrom(selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            )}

            {showToPicker && (
              <DateTimePicker
                value={customTo}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedDate) => {
                  setShowToPicker(Platform.OS === "ios");
                  if (selectedDate) {
                    setCustomTo(selectedDate);
                  }
                }}
                maximumDate={new Date()}
                minimumDate={customFrom}
              />
            )}

            {customFrom > customTo && (
              <Text style={styles.errorText}>
                From date must be before To date
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.modalButton,
                customFrom > customTo && styles.modalButtonDisabled,
              ]}
              onPress={handleCustomPeriodSave}
              disabled={customFrom > customTo}
            >
              <Text style={styles.modalButtonText}>Apply</Text>
            </TouchableOpacity>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    position: "relative" as const,
    overflow: "hidden",
  },
  animatedCircle1: {
    position: "absolute" as const,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    top: -30,
    right: -20,
  },
  animatedCircle2: {
    position: "absolute" as const,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    bottom: -60,
    left: -40,
  },
  contentWrapper: {
    zIndex: 1,
  },
  accountSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  accountLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  accountName: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#FFF",
  },
  accountPicker: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  accountOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  accountOptionActive: {
    backgroundColor: "#EFF6FF",
  },
  accountOptionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accountOptionName: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500" as const,
  },
  accountOptionNameActive: {
    color: "#3B82F6",
    fontWeight: "600" as const,
  },
  accountOptionBalance: {
    fontSize: 16,
    color: "#6B7280",
  },
  accountOptionBalanceActive: {
    color: "#3B82F6",
    fontWeight: "600" as const,
  },
  balanceContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  balance: {
    fontSize: 36,
    fontWeight: "700" as const,
    color: "#FFF",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 14,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFF",
  },
  netBalanceContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  netBalancePositive: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  netBalanceNegative: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  netBalanceLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
  },
  netBalanceValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#FFF",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  insightsSection: {
    gap: 12,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#0F172A",
  },
  insightsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16,185,129,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  insightsBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#059669",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  insightsCarousel: {
    paddingVertical: 4,
    paddingRight: 20,
    columnGap: 12,
  },
  insightCard: {
    width: 220,
    borderRadius: 20,
    padding: 16,
  },
  insightLabel: {
    fontSize: 12,
    color: "rgba(248,250,252,0.85)",
    marginBottom: 8,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#FFF",
    marginBottom: 6,
  },
  insightDescription: {
    fontSize: 16,
    color: "rgba(248,250,252,0.9)",
    marginBottom: 4,
  },
  insightCaption: {
    fontSize: 12,
    color: "rgba(248,250,252,0.7)",
  },
  periodSummaryCard: {
    marginTop: 4,
  },
  periodSummaryGradient: {
    borderRadius: 24,
    padding: 20,
  },
  periodSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  periodSummaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(248,250,252,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  periodSummaryTextWrapper: {
    flex: 1,
  },
  periodSummaryLabel: {
    fontSize: 13,
    color: "rgba(248,250,252,0.8)",
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  periodSummaryRange: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#F8FAFC",
  },
  periodSummaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  periodSummaryMeta: {
    flex: 1,
  },
  periodSummaryMetaLabel: {
    fontSize: 12,
    color: "rgba(248,250,252,0.75)",
    marginBottom: 4,
  },
  periodSummaryMetaValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#F8FAFC",
  },
  periodSummaryPositive: {
    color: "#34D399",
  },
  periodSummaryNegative: {
    color: "#F87171",
  },
  periodSummaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(248,250,252,0.3)",
    marginHorizontal: 16,
    borderRadius: 999,
  },
  chartSection: {
    marginTop: 4,
  },
  smartCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  smartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  smartIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(253, 230, 138, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  smartHeaderText: {
    flex: 1,
  },
  smartTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#F8FAFC",
  },
  smartSubtitle: {
    fontSize: 14,
    color: "rgba(248,250,252,0.8)",
    marginTop: 4,
    lineHeight: 20,
  },
  smartStatsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    columnGap: 12,
  },
  smartStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  smartStatLabel: {
    fontSize: 12,
    color: "#94A3B8",
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  smartStatValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#F8FAFC",
  },
  smartStatDivider: {
    width: 1,
    backgroundColor: "rgba(148,163,184,0.4)",
    borderRadius: 999,
  },
  smartCardEmptyText: {
    fontSize: 14,
    color: "#CBD5F5",
    lineHeight: 20,
  },
  smartCardButton: {
    borderRadius: 16,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    alignItems: "center",
  },
  smartCardButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#FFF",
  },
  quickStatsCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  quickStatsTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 16,
  },
  quickStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  quickStatItem: {
    flex: 1,
    alignItems: "center",
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
  },
  quickStatLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#111827",
  },
  quickStatValuePositive: {
    color: "#10B981",
  },
  quickStatValueNegative: {
    color: "#EF4444",
  },
  periodSelector: {
    marginVertical: 16,
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  transactionsList: {
    gap: 8,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
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
  transactionDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  transactionAmountIncome: {
    color: "#10B981",
  },
  transactionAmountExpense: {
    color: "#EF4444",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  incomeButton: {
    backgroundColor: "#10B981",
  },
  transferButton: {
    backgroundColor: "#1D4ED8",
  },
  expenseButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFF",
  },
  noAccount: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
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
    minHeight: 300,
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
  dateSection: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#374151",
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#111827",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  modalButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFF",
  },
});
