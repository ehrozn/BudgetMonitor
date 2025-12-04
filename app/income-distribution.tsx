import { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    Switch,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../context/AppContext";
import type { IncomeDistributionRule } from "../types";
import {
    Plus,
    X,
    Edit3,
    Trash2,
    ChevronRight,
    AlertCircle,
} from "lucide-react-native";
import { hapticSelection, hapticSuccess, hapticError } from "../utils/haptics";
import { getCategoryIconComponent } from "../constants/categoryIcons";
import type { CategoryIconName } from "../constants/categoryIcons";
import {
    DISTRIBUTION_RULE_COLORS,
    DISTRIBUTION_RULE_ICONS,
} from "../constants/distributionRulesColors";

export default function IncomeDistributionScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {
        accounts,
        incomeDistributionRules,
        getCategoriesByType,
        addIncomeDistributionRule,
        updateIncomeDistributionRule,
        deleteIncomeDistributionRule,
        toggleIncomeDistributionRule,
    } = useApp();

    const expenseCategories = getCategoriesByType("expense");
    const activeAccounts = accounts.filter((account: any) => !account.isArchived);

    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [name, setName] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [percentage, setPercentage] = useState<string>("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [selectedColor, setSelectedColor] = useState<string>(DISTRIBUTION_RULE_COLORS[0]);
    const [selectedIcon, setSelectedIcon] = useState<string>(DISTRIBUTION_RULE_ICONS[0]);
    const [isLinkedToTransfer, setIsLinkedToTransfer] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const groupedRules = useMemo(() => {
        const groups: Record<string, IncomeDistributionRule[]> = {};
        incomeDistributionRules.forEach((rule: IncomeDistributionRule) => {
            if (!groups[rule.accountId]) {
                groups[rule.accountId] = [];
            }
            groups[rule.accountId].push(rule);
        });
        return groups;
    }, [incomeDistributionRules]);

    const handleOpenModal = (accountId?: string, rule?: IncomeDistributionRule) => {
        hapticSelection();
        if (rule) {
            setEditingRuleId(rule.id);
            setSelectedAccountId(rule.accountId);
            setName(rule.name);
            setDescription(rule.description || "");
            setPercentage(String(rule.percentage));
            setSelectedCategoryId(rule.categoryId);
            setSelectedColor(rule.color);
            setSelectedIcon(rule.icon);
            setIsLinkedToTransfer(rule.linkedToSmartTransfer);
        } else {
            setEditingRuleId(null);
            setSelectedAccountId(accountId || activeAccounts[0]?.id || "");
            setName("");
            setDescription("");
            setPercentage("");
            setSelectedCategoryId(expenseCategories[0]?.id || "");
            setSelectedColor(DISTRIBUTION_RULE_COLORS[0]);
            setSelectedIcon(DISTRIBUTION_RULE_ICONS[0]);
            setIsLinkedToTransfer(false);
        }
        setError("");
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
        setError("");
    };

    const handleSave = () => {
        if (!name.trim()) {
            setError("Please enter a name");
            hapticError();
            return;
        }

        const percentageNum = Number.parseFloat(percentage);
        if (Number.isNaN(percentageNum) || percentageNum <= 0 || percentageNum > 100) {
            setError("Percentage must be between 1 and 100");
            hapticError();
            return;
        }

        if (!selectedAccountId) {
            setError("Please select an account");
            hapticError();
            return;
        }

        if (!selectedCategoryId) {
            setError("Please select a category");
            hapticError();
            return;
        }

        if (editingRuleId) {
            const result = updateIncomeDistributionRule(editingRuleId, {
                name: name.trim(),
                description: description.trim() || null,
                percentage: percentageNum,
                categoryId: selectedCategoryId,
                color: selectedColor,
                icon: selectedIcon,
                linkedToSmartTransfer: isLinkedToTransfer,
            });

            if (!result.success) {
                setError(result.error || "Failed to update rule");
                hapticError();
                return;
            }
        } else {
            const result = addIncomeDistributionRule({
                accountId: selectedAccountId,
                name: name.trim(),
                description: description.trim() || null,
                percentage: percentageNum,
                categoryId: selectedCategoryId,
                color: selectedColor,
                icon: selectedIcon,
                linkedToSmartTransfer: isLinkedToTransfer,
            });

            if (!result.success) {
                setError(result.error || "Failed to create rule");
                hapticError();
                return;
            }
        }

        hapticSuccess();
        handleCloseModal();
    };

    const handleDelete = (ruleId: string) => {
        Alert.alert("Delete Rule", "Are you sure you want to delete this distribution rule?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                    const result = deleteIncomeDistributionRule(ruleId);
                    if (result.success) {
                        hapticSuccess();
                    } else {
                        hapticError();
                        Alert.alert("Error", result.error || "Failed to delete rule");
                    }
                },
            },
        ]);
    };

    const handleToggle = (ruleId: string, currentState: boolean) => {
        hapticSelection();
        toggleIncomeDistributionRule(ruleId, !currentState);
    };

    const getAccountTotalPercentage = (accountId: string): number => {
        const rules = groupedRules[accountId] || [];
        return rules
            .filter((rule) => rule.isActive)
            .reduce((sum, rule) => sum + rule.percentage, 0);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        hapticSelection();
                        router.back();
                    }}
                    testID="back-button"
                >
                    <ChevronRight color="#111827" size={24} style={{ transform: [{ rotate: "180deg" }] }} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Income Distribution</Text>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => handleOpenModal()}
                    testID="add-distribution-rule"
                >
                    <Plus color="#FFF" size={20} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 24 },
                ]}
            >
                {activeAccounts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <AlertCircle color="#9CA3AF" size={48} />
                        <Text style={styles.emptyStateText}>No accounts available</Text>
                        <Text style={styles.emptyStateSubtext}>
                            Create an account to set up income distribution rules
                        </Text>
                    </View>
                ) : null}

                {activeAccounts.map((account: any) => {
                    const accountRules = groupedRules[account.id] || [];
                    const totalPercentage = getAccountTotalPercentage(account.id);

                    return (
                        <View key={account.id} style={styles.accountSection}>
                            <View style={styles.accountHeader}>
                                <View style={styles.accountHeaderContent}>
                                    <View
                                        style={[styles.accountColorDot, { backgroundColor: account.color }]}
                                    />
                                    <View style={styles.accountHeaderText}>
                                        <Text style={styles.accountName}>{account.name}</Text>
                                        <Text
                                            style={[
                                                styles.accountPercentage,
                                                totalPercentage > 100 && styles.accountPercentageWarning,
                                            ]}
                                        >
                                            {totalPercentage}% allocated
                                            {totalPercentage > 100 ? " (exceeds 100%)" : ""}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.addRuleButton}
                                    onPress={() => handleOpenModal(account.id)}
                                    testID={`add-rule-${account.id}`}
                                >
                                    <Plus color="#3B82F6" size={20} />
                                </TouchableOpacity>
                            </View>

                            {accountRules.length === 0 ? (
                                <View style={styles.noRulesContainer}>
                                    <Text style={styles.noRulesText}>
                                        No distribution rules for this account
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.rulesContainer}>
                                    {accountRules.map((rule) => {
                                        const RuleIcon = getCategoryIconComponent(
                                            rule.icon as CategoryIconName,
                                        );
                                        const category = expenseCategories.find(
                                            (cat: any) => cat.id === rule.categoryId,
                                        );

                                        return (
                                            <View
                                                key={rule.id}
                                                style={[
                                                    styles.ruleCard,
                                                    !rule.isActive && styles.ruleCardInactive,
                                                ]}
                                            >
                                                <View style={styles.ruleContent}>
                                                    <View
                                                        style={[
                                                            styles.ruleIconContainer,
                                                            { backgroundColor: rule.color + "20" },
                                                        ]}
                                                    >
                                                        <RuleIcon color={rule.color} size={24} />
                                                    </View>
                                                    <View style={styles.ruleInfo}>
                                                        <Text style={styles.ruleName}>{rule.name}</Text>
                                                        {rule.description ? (
                                                            <Text style={styles.ruleDescription}>
                                                                {rule.description}
                                                            </Text>
                                                        ) : null}
                                                        <Text style={styles.ruleCategory}>
                                                            {category?.name || "Unknown category"}
                                                        </Text>
                                                        {rule.linkedToSmartTransfer ? (
                                                            <Text style={styles.ruleLinkedText}>Linked to Smart Transfer</Text>
                                                        ) : null}
                                                    </View>
                                                    <View style={styles.ruleActions}>
                                                        <Text style={styles.rulePercentage}>
                                                            {rule.percentage}%
                                                        </Text>
                                                        <Switch
                                                            value={rule.isActive}
                                                            onValueChange={() =>
                                                                handleToggle(rule.id, rule.isActive)
                                                            }
                                                            trackColor={{ true: "#3B82F6", false: "#D1D5DB" }}
                                                            thumbColor="#FFF"
                                                        />
                                                    </View>
                                                </View>
                                                <View style={styles.ruleFooter}>
                                                    <TouchableOpacity
                                                        style={styles.ruleActionButton}
                                                        onPress={() => handleOpenModal(account.id, rule)}
                                                        testID={`edit-rule-${rule.id}`}
                                                    >
                                                        <Edit3 color="#6B7280" size={16} />
                                                        <Text style={styles.ruleActionButtonText}>Edit</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.ruleActionButton}
                                                        onPress={() => handleDelete(rule.id)}
                                                        testID={`delete-rule-${rule.id}`}
                                                    >
                                                        <Trash2 color="#EF4444" size={16} />
                                                        <Text style={[styles.ruleActionButtonText, styles.deleteText]}>
                                                            Delete
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    );
                })}

                {activeAccounts.length > 0 && incomeDistributionRules.length === 0 ? (
                    <View style={styles.emptyState}>
                        <AlertCircle color="#9CA3AF" size={48} />
                        <Text style={styles.emptyStateText}>No distribution rules</Text>
                        <Text style={styles.emptyStateSubtext}>
                            Tap + to create your first income distribution rule
                        </Text>
                    </View>
                ) : null}
            </ScrollView>

            <Modal
                visible={isModalVisible}
                transparent
                animationType="slide"
                onRequestClose={handleCloseModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingRuleId ? "Edit Rule" : "New Distribution Rule"}
                            </Text>
                            <TouchableOpacity
                                onPress={handleCloseModal}
                                style={styles.modalCloseButton}
                                testID="close-modal"
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.modalForm}>
                                <View style={styles.modalField}>
                                    <Text style={styles.modalLabel}>Account *</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.accountsScroll}
                                    >
                                        {activeAccounts.map((account: any) => (
                                            <TouchableOpacity
                                                key={account.id}
                                                style={[
                                                    styles.accountOption,
                                                    selectedAccountId === account.id &&
                                                    styles.accountOptionActive,
                                                ]}
                                                onPress={() => {
                                                    hapticSelection();
                                                    setSelectedAccountId(account.id);
                                                }}
                                                testID={`select-account-${account.id}`}
                                            >
                                                <View
                                                    style={[
                                                        styles.accountOptionDot,
                                                        { backgroundColor: account.color },
                                                    ]}
                                                />
                                                <Text
                                                    style={[
                                                        styles.accountOptionText,
                                                        selectedAccountId === account.id &&
                                                        styles.accountOptionTextActive,
                                                    ]}
                                                >
                                                    {account.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                <View style={styles.modalField}>
                                    <Text style={styles.modalLabel}>Name *</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        value={name}
                                        onChangeText={(value) => {
                                            setName(value);
                                            setError("");
                                        }}
                                        placeholder="e.g. Charity, Taxes, Savings"
                                        placeholderTextColor="#9CA3AF"
                                        maxLength={50}
                                        testID="rule-name-input"
                                    />
                                </View>

                                <View style={styles.modalField}>
                                    <Text style={styles.modalLabel}>Description (optional)</Text>
                                    <TextInput
                                        style={[styles.modalInput, styles.modalTextArea]}
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder="Purpose of this distribution"
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        maxLength={200}
                                        numberOfLines={3}
                                        testID="rule-description-input"
                                    />
                                </View>

                                <View style={styles.modalField}>
                                    <Text style={styles.modalLabel}>Percentage *</Text>
                                    <View style={styles.percentageInputContainer}>
                                        <TextInput
                                            style={styles.percentageInput}
                                            value={percentage}
                                            onChangeText={(value) => {
                                                const cleaned = value.replace(/[^0-9.]/g, "");
                                                setPercentage(cleaned);
                                                setError("");
                                            }}
                                            placeholder="0"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="decimal-pad"
                                            maxLength={5}
                                            testID="percentage-input"
                                        />
                                        <Text style={styles.percentageSymbol}>%</Text>
                                    </View>
                                </View>

                                <View style={styles.modalField}>
                                    <Text style={styles.modalLabel}>Category *</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.categoriesScroll}
                                    >
                                        {expenseCategories.map((category: any) => {
                                            const CategoryIcon = getCategoryIconComponent(category.icon);
                                            const isSelected = selectedCategoryId === category.id;

                                            return (
                                                <TouchableOpacity
                                                    key={category.id}
                                                    style={[
                                                        styles.categoryOption,
                                                        isSelected && styles.categoryOptionActive,
                                                    ]}
                                                    onPress={() => {
                                                        hapticSelection();
                                                        setSelectedCategoryId(category.id);
                                                    }}
                                                    testID={`select-category-${category.id}`}
                                                >
                                                    <CategoryIcon
                                                        color={isSelected ? "#3B82F6" : "#6B7280"}
                                                        size={18}
                                                    />
                                                    <Text
                                                        style={[
                                                            styles.categoryOptionText,
                                                            isSelected && styles.categoryOptionTextActive,
                                                        ]}
                                                    >
                                                        {category.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>

                                <View style={styles.modalField}>
                                    <Text style={styles.modalLabel}>Color</Text>
                                    <View style={styles.colorsGrid}>
                                        {DISTRIBUTION_RULE_COLORS.map((color) => (
                                            <TouchableOpacity
                                                key={color}
                                                style={[
                                                    styles.colorOption,
                                                    { backgroundColor: color },
                                                    selectedColor === color && styles.colorOptionActive,
                                                ]}
                                                onPress={() => {
                                                    hapticSelection();
                                                    setSelectedColor(color);
                                                }}
                                                testID={`select-color-${color}`}
                                            />
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.modalField}>
                                    <Text style={styles.modalLabel}>Icon</Text>
                                    <View style={styles.iconsGrid}>
                                        {DISTRIBUTION_RULE_ICONS.map((iconName) => {
                                            const Icon = getCategoryIconComponent(
                                                iconName as CategoryIconName,
                                            );
                                            const isSelected = selectedIcon === iconName;

                                            return (
                                                <TouchableOpacity
                                                    key={iconName}
                                                    style={[
                                                        styles.iconOption,
                                                        isSelected && styles.iconOptionActive,
                                                    ]}
                                                    onPress={() => {
                                                        hapticSelection();
                                                        setSelectedIcon(iconName);
                                                    }}
                                                    testID={`select-icon-${iconName}`}
                                                >
                                                    <Icon
                                                        color={isSelected ? selectedColor : "#6B7280"}
                                                        size={24}
                                                    />
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                <View style={styles.modalField}>
                                    <View style={styles.switchRow}>
                                        <View style={styles.switchRowText}>
                                            <Text style={styles.modalLabel}>Link to Smart Transfer</Text>
                                            <Text style={styles.switchRowDescription}>
                                                Automatically executed with smart transfers
                                            </Text>
                                        </View>
                                        <Switch
                                            value={isLinkedToTransfer}
                                            onValueChange={(value) => {
                                                hapticSelection();
                                                setIsLinkedToTransfer(value);
                                            }}
                                            trackColor={{ true: "#3B82F6", false: "#D1D5DB" }}
                                            thumbColor="#FFF"
                                            testID="toggle-linked-transfer"
                                        />
                                    </View>
                                </View>

                                {error ? (
                                    <Text style={styles.errorText}>{error}</Text>
                                ) : null}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.modalSaveButton}
                            onPress={handleSave}
                            testID="save-rule"
                        >
                            <Text style={styles.modalSaveButtonText}>
                                {editingRuleId ? "Update Rule" : "Create Rule"}
                            </Text>
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#111827",
        flex: 1,
        textAlign: "center" as const,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#3B82F6",
        alignItems: "center",
        justifyContent: "center",
    },
    scrollContent: {
        padding: 20,
        gap: 20,
    },
    accountSection: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 16,
        gap: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    accountHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    accountHeaderContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    accountColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    accountHeaderText: {
        flex: 1,
        gap: 4,
    },
    accountName: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#111827",
    },
    accountPercentage: {
        fontSize: 14,
        color: "#6B7280",
    },
    accountPercentageWarning: {
        color: "#EF4444",
        fontWeight: "600" as const,
    },
    addRuleButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
    },
    noRulesContainer: {
        padding: 24,
        alignItems: "center",
    },
    noRulesText: {
        fontSize: 14,
        color: "#9CA3AF",
    },
    rulesContainer: {
        gap: 12,
    },
    ruleCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 12,
        gap: 12,
    },
    ruleCardInactive: {
        opacity: 0.6,
    },
    ruleContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    ruleIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    ruleInfo: {
        flex: 1,
        gap: 4,
    },
    ruleName: {
        fontSize: 16,
        fontWeight: "600" as const,
        color: "#111827",
    },
    ruleDescription: {
        fontSize: 13,
        color: "#6B7280",
    },
    ruleCategory: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    ruleLinkedText: {
        fontSize: 12,
        color: "#3B82F6",
        fontWeight: "600" as const,
    },
    ruleActions: {
        alignItems: "flex-end",
        gap: 8,
    },
    rulePercentage: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#3B82F6",
    },
    ruleFooter: {
        flexDirection: "row",
        gap: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    ruleActionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#FFF",
    },
    ruleActionButtonText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    deleteText: {
        color: "#EF4444",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
        gap: 12,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center" as const,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(17, 24, 39, 0.6)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "700" as const,
        color: "#111827",
    },
    modalCloseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    modalForm: {
        gap: 20,
    },
    modalField: {
        gap: 8,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#374151",
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
    },
    modalInput: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: "#111827",
    },
    modalTextArea: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    percentageInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    percentageInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 20,
        fontWeight: "600" as const,
        color: "#111827",
    },
    percentageSymbol: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#3B82F6",
        marginLeft: 8,
    },
    accountsScroll: {
        gap: 8,
    },
    accountOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    accountOptionActive: {
        backgroundColor: "#EFF6FF",
        borderColor: "#3B82F6",
    },
    accountOptionDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    accountOptionText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    accountOptionTextActive: {
        color: "#3B82F6",
    },
    categoriesScroll: {
        gap: 8,
    },
    categoryOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    categoryOptionActive: {
        backgroundColor: "#EFF6FF",
        borderColor: "#3B82F6",
    },
    categoryOptionText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    categoryOptionTextActive: {
        color: "#3B82F6",
    },
    colorsGrid: {
        flexDirection: "row",
        flexWrap: "wrap" as const,
        gap: 12,
    },
    colorOption: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: "transparent",
    },
    colorOptionActive: {
        borderColor: "#111827",
    },
    iconsGrid: {
        flexDirection: "row",
        flexWrap: "wrap" as const,
        gap: 12,
    },
    iconOption: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    iconOptionActive: {
        backgroundColor: "#EFF6FF",
        borderColor: "#3B82F6",
    },
    errorText: {
        fontSize: 14,
        color: "#EF4444",
    },
    modalSaveButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 24,
    },
    modalSaveButtonText: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFF",
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 16,
    },
    switchRowText: {
        flex: 1,
        gap: 4,
    },
    switchRowDescription: {
        fontSize: 13,
        color: "#6B7280",
    },
});
