import { View, Text, StyleSheet } from "react-native";
import { useMemo } from "react";

interface ExpenseChartProps {
    expensesByCategory: Record<string, number>;
    currency: string;
}

const CHART_COLORS = [
    "#EF4444",
    "#F59E0B",
    "#10B981",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#14B8A6",
];

export default function ExpenseChart({ expensesByCategory, currency }: ExpenseChartProps) {
    const chartData = useMemo(() => {
        const entries = Object.entries(expensesByCategory);
        const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

        if (total === 0) return [];

        return entries
            .map(([category, amount], index) => ({
                category,
                amount,
                percentage: (amount / total) * 100,
                color: CHART_COLORS[index % CHART_COLORS.length],
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [expensesByCategory]);

    if (chartData.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No expenses to display</Text>
            </View>
        );
    }

    const maxAmount = Math.max(...chartData.map((item) => item.amount));

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Expenses by Category</Text>

            {chartData.map((item, index) => (
                <View key={item.category} style={styles.barContainer}>
                    <View style={styles.labelContainer}>
                        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                        <Text style={styles.categoryText} numberOfLines={1}>
                            {item.category}
                        </Text>
                    </View>

                    <View style={styles.barWrapper}>
                        <View
                            style={[
                                styles.bar,
                                {
                                    backgroundColor: item.color,
                                    width: `${(item.amount / maxAmount) * 100}%`,
                                },
                            ]}
                        />
                    </View>

                    <View style={styles.valueContainer}>
                        <Text style={styles.valueText}>
                            {currency}{item.amount.toFixed(2)}
                        </Text>
                        <Text style={styles.percentageText}>
                            {item.percentage.toFixed(1)}%
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#111827",
        marginBottom: 16,
    },
    barContainer: {
        marginBottom: 16,
    },
    labelContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    colorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#374151",
        flex: 1,
    },
    barWrapper: {
        height: 8,
        backgroundColor: "#F3F4F6",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 6,
    },
    bar: {
        height: "100%",
        borderRadius: 4,
    },
    valueContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    valueText: {
        fontSize: 13,
        fontWeight: "600" as const,
        color: "#111827",
    },
    percentageText: {
        fontSize: 12,
        color: "#6B7280",
    },
    emptyContainer: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 32,
        alignItems: "center",
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 14,
        color: "#9CA3AF",
    },
});
