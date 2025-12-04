import { useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Switch,
    Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
    Sparkles,
    ArrowRight,
    Edit3,
    Trash2,
    Percent,
    DollarSign,
    ChevronRight,
} from "lucide-react-native";
import { useApp } from "../context/AppContext";
import { TransferRule } from "../types";
import { hapticError, hapticLight, hapticSelection, hapticSuccess } from "../utils/haptics";

interface BannerState {
    type: "success" | "error";
    message: string;
}

interface TransferRuleFormState {
    sourceAccountId: string;
    targetAccountId: string;
    allocationType: "percentage" | "fixed";
    value: string;
    noteTemplate: string;
}

export default function TransferAutomationScreen() {
    const insets = useSafeAreaInsets();
    const {
        transferRules,
        getActiveAccounts,
        addTransferRule,
        updateTransferRule,
        deleteTransferRule,
        toggleTransferRule,
    } = useApp();
    const accounts = getActiveAccounts();

    const accountMap = useMemo(() => {
        const map: Record<string, { name: string; color: string }> = {};
        accounts.forEach((account: any) => {
            map[account.id] = { name: account.name, color: account.color };
        });
        return map;
    }, [accounts]);

    const preparedRules = useMemo(() => {
        return transferRules.map((rule: any) => ({
            ...rule,
            sourceName: accountMap[rule.sourceAccountId]?.name ?? "Account removed",
            sourceColor: accountMap[rule.sourceAccountId]?.color ?? "#94A3B8",
            targetName: accountMap[rule.targetAccountId]?.name ?? "Account removed",
            targetColor: accountMap[rule.targetAccountId]?.color ?? "#94A3B8",
        }));
    }, [transferRules, accountMap]);

    const activeCount = useMemo(() => transferRules.filter((rule: any) => rule.isActive).length, [transferRules]);
    const percentageAverage = useMemo(() => {
        const percentageRules = transferRules.filter((rule: any) => rule.allocationType === "percentage" && rule.percentage);
        if (percentageRules.length === 0) {
            return 0;
        }
        const sum = percentageRules.reduce((total: number, rule: any) => total + (rule.percentage ?? 0), 0);
        return sum / percentageRules.length;
    }, [transferRules]);
    const fixedTotal = useMemo(() => {
        return transferRules
            .filter((rule: any) => rule.allocationType === "fixed" && rule.fixedAmount)
            .reduce((total: number, rule: any) => total + (rule.fixedAmount ?? 0), 0);
    }, [transferRules]);

    const [formVisible, setFormVisible] = useState<boolean>(false);
    const [pickerType, setPickerType] = useState<"source" | "target" | null>(null);
    const [formState, setFormState] = useState<TransferRuleFormState>({
        sourceAccountId: "",
        targetAccountId: "",
        allocationType: "percentage",
        value: "",
        noteTemplate: "",
    });
    const [formError, setFormError] = useState<string>("");
    const [banner, setBanner] = useState<BannerState | null>(null);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const showBanner = (nextBanner: BannerState) => {
        setBanner(nextBanner);
    };

    const resetFormState = (defaults?: Partial<TransferRuleFormState>) => {
        const defaultSource = defaults?.sourceAccountId ?? accounts[0]?.id ?? "";
        const defaultTarget = defaults?.targetAccountId ?? accounts.find((account: any) => account.id !== defaultSource)?.id ?? "";
        setFormState({
            sourceAccountId: defaultSource,
            targetAccountId: defaultTarget ?? "",
            allocationType: defaults?.allocationType ?? "percentage",
            value: defaults?.value ?? "",
            noteTemplate: defaults?.noteTemplate ?? "",
        });
    };

    const handleOpenCreate = () => {
        console.log("[TransferAutomation] Opening create form");
        hapticLight();
        setEditingRuleId(null);
        resetFormState();
        setFormError("");
        setFormVisible(true);
    };

    const handleOpenEdit = (rule: TransferRule) => {
        console.log("[TransferAutomation] Editing rule", rule.id);
        hapticSelection();
        setEditingRuleId(rule.id);
        resetFormState({
            sourceAccountId: rule.sourceAccountId,
            targetAccountId: rule.targetAccountId,
            allocationType: rule.allocationType,
            value: rule.allocationType === "percentage" ? String(rule.percentage ?? "") : String(rule.fixedAmount ?? ""),
            noteTemplate: rule.noteTemplate ?? "",
        });
        setFormError("");
        setFormVisible(true);
    };

    const handleCloseForm = () => {
        console.log("[TransferAutomation] Closing form");
        setFormVisible(false);
        setPickerType(null);
        setFormError("");
        setEditingRuleId(null);
        setIsProcessing(false);
    };

    const handleSelectAccount = (type: "source" | "target", accountId: string) => {
        console.log(`[TransferAutomation] Selecting ${type} account`, accountId);
        setFormState((previous) => {
            if (type === "source") {
                const nextTarget = accountId === previous.targetAccountId
                    ? accounts.find((account: any) => account.id !== accountId)?.id ?? ""
                    : previous.targetAccountId;
                return { ...previous, sourceAccountId: accountId, targetAccountId: nextTarget };
            }
            const nextSource = accountId === previous.sourceAccountId
                ? accounts.find((account: any) => account.id !== accountId)?.id ?? ""
                : previous.sourceAccountId;
            return { ...previous, targetAccountId: accountId, sourceAccountId: nextSource };
        });
        setFormError("");
        setPickerType(null);
        hapticSelection();
    };

    const handleAllocationTypeChange = (allocationType: "percentage" | "fixed") => {
        console.log("[TransferAutomation] Allocation type change", allocationType);
        hapticSelection();
        setFormState((previous) => ({
            ...previous,
            allocationType,
            value: "",
        }));
        setFormError("");
    };

    const handleValueChange = (input: string) => {
        const sanitized = input.replace(/[^0-9.]/g, "");
        const parts = sanitized.split(".");
        if (parts.length > 2) {
            return;
        }
        if (parts[1] && parts[1].length > 2) {
            return;
        }
        setFormState((previous) => ({ ...previous, value: sanitized }));
        setFormError("");
    };

    const handleNoteChange = (value: string) => {
        setFormState((previous) => ({ ...previous, noteTemplate: value }));
        setFormError("");
    };

    const handleSubmit = () => {
        if (isProcessing) {
            return;
        }

        if (!formState.sourceAccountId || !formState.targetAccountId) {
            setFormError("Select both accounts");
            hapticError();
            return;
        }

        if (formState.sourceAccountId === formState.targetAccountId) {
            setFormError("Choose two different accounts");
            hapticError();
            return;
        }

        const numericValue = Number.parseFloat(formState.value);
        if (Number.isNaN(numericValue) || numericValue <= 0) {
            setFormError("Enter a valid amount");
            hapticError();
            return;
        }

        if (formState.allocationType === "percentage" && numericValue > 100) {
            setFormError("Percentage cannot exceed 100");
            hapticError();
            return;
        }

        setIsProcessing(true);

        try {
            if (editingRuleId) {
                console.log("[TransferAutomation] Updating rule", editingRuleId, formState);
                const result = updateTransferRule(editingRuleId, {
                    sourceAccountId: formState.sourceAccountId,
                    targetAccountId: formState.targetAccountId,
                    allocationType: formState.allocationType,
                    percentage: formState.allocationType === "percentage" ? numericValue : undefined,
                    fixedAmount: formState.allocationType === "fixed" ? numericValue : undefined,
                    noteTemplate: formState.noteTemplate.trim() ? formState.noteTemplate.trim() : null,
                });
                if (!result.success) {
                    console.error("[TransferAutomation] Update failed", result.error);
                    setFormError(result.error ?? "Unable to update rule");
                    hapticError();
                    return;
                }
                showBanner({ type: "success", message: "Rule updated" });
            } else {
                console.log("[TransferAutomation] Creating rule", formState);
                const result = addTransferRule({
                    sourceAccountId: formState.sourceAccountId,
                    targetAccountId: formState.targetAccountId,
                    allocationType: formState.allocationType,
                    percentage: formState.allocationType === "percentage" ? numericValue : undefined,
                    fixedAmount: formState.allocationType === "fixed" ? numericValue : undefined,
                    noteTemplate: formState.noteTemplate.trim() ? formState.noteTemplate.trim() : null,
                });
                if (!result.success) {
                    console.error("[TransferAutomation] Create failed", result.error);
                    setFormError(result.error ?? "Unable to create rule");
                    hapticError();
                    return;
                }
                showBanner({ type: "success", message: "Rule created" });
            }
            hapticSuccess();
            handleCloseForm();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleRule = (ruleId: string, nextValue: boolean) => {
        console.log("[TransferAutomation] Toggle rule", ruleId, nextValue);
        const result = toggleTransferRule(ruleId, nextValue);
        if (!result.success) {
            console.error("[TransferAutomation] Toggle failed", result.error);
            showBanner({ type: "error", message: result.error ?? "Unable to update rule" });
            hapticError();
            return;
        }
        hapticLight();
        showBanner({ type: "success", message: nextValue ? "Rule activated" : "Rule paused" });
    };

    const handleDeleteRule = (ruleId: string) => {
        console.log("[TransferAutomation] Delete rule", ruleId);
        hapticSelection();
        const result = deleteTransferRule(ruleId);
        if (!result.success) {
            console.error("[TransferAutomation] Delete failed", result.error);
            showBanner({ type: "error", message: result.error ?? "Unable to delete rule" });
            hapticError();
            return;
        }
        showBanner({ type: "success", message: "Rule removed" });
        hapticSuccess();
    };

    const allocationLabel = formState.allocationType === "percentage" ? "Percentage" : "Amount";
    const allocationSuffix = formState.allocationType === "percentage" ? "%" : "$";

    const renderAccountPicker = () => (
        <Modal
            transparent
            animationType="slide"
            visible={Boolean(pickerType)}
            onRequestClose={() => setPickerType(null)}
        >
            <View style={styles.pickerOverlay}>
                <View style={styles.pickerSheet}>
                    <View style={styles.pickerHeader}>
                        <Text style={styles.pickerTitle}>
                            {pickerType === "source" ? "Choose funding account" : "Choose destination"}
                        </Text>
                        <TouchableOpacity onPress={() => setPickerType(null)}>
                            <Text style={styles.pickerClose}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.pickerList}>
                        {accounts.map((account: any) => {
                            const isSelected = pickerType === "source"
                                ? formState.sourceAccountId === account.id
                                : formState.targetAccountId === account.id;
                            return (
                                <TouchableOpacity
                                    key={account.id}
                                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                                    onPress={() => handleSelectAccount(pickerType ?? "source", account.id)}
                                    testID={`automation-picker-${pickerType}-${account.id}`}
                                >
                                    <View style={styles.pickerItemLeft}>
                                        <View style={[styles.colorDot, { backgroundColor: account.color }]} />
                                        <View>
                                            <Text style={styles.pickerName}>{account.name}</Text>
                                            <Text style={styles.pickerMeta}>Tap to select</Text>
                                        </View>
                                    </View>
                                    <ChevronRight color={isSelected ? "#2563EB" : "#D1D5DB"} size={20} />
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderFormModal = () => (
        <Modal transparent animationType="slide" visible={formVisible} onRequestClose={handleCloseForm}>
            <View style={styles.formOverlay}>
                <View style={styles.formSheet}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>{editingRuleId ? "Edit automation" : "New automation"}</Text>
                        <TouchableOpacity onPress={handleCloseForm} testID="automation-form-close">
                            <Text style={styles.formClose}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Source account</Text>
                        <TouchableOpacity
                            style={styles.selector}
                            onPress={() => {
                                hapticLight();
                                setPickerType("source");
                            }}
                            testID="automation-form-source"
                        >
                            <View style={styles.selectorLeft}>
                                <View
                                    style={[styles.colorDot, { backgroundColor: accountMap[formState.sourceAccountId]?.color ?? "#94A3B8" }]}
                                />
                                <Text style={styles.selectorText}>
                                    {accountMap[formState.sourceAccountId]?.name ?? "Select account"}
                                </Text>
                            </View>
                            <ChevronRight color="#9CA3AF" size={18} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Destination account</Text>
                        <TouchableOpacity
                            style={styles.selector}
                            onPress={() => {
                                hapticLight();
                                setPickerType("target");
                            }}
                            testID="automation-form-target"
                        >
                            <View style={styles.selectorLeft}>
                                <View
                                    style={[styles.colorDot, { backgroundColor: accountMap[formState.targetAccountId]?.color ?? "#94A3B8" }]}
                                />
                                <Text style={styles.selectorText}>
                                    {accountMap[formState.targetAccountId]?.name ?? "Select account"}
                                </Text>
                            </View>
                            <ChevronRight color="#9CA3AF" size={18} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.formLabel}>Allocation type</Text>
                        <View style={styles.typeSwitch}>
                            {(["percentage", "fixed"] as const).map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.typeChip, formState.allocationType === type && styles.typeChipActive]}
                                    onPress={() => handleAllocationTypeChange(type)}
                                    testID={`automation-form-type-${type}`}
                                >
                                    {type === "percentage" ? (
                                        <Percent
                                            color={formState.allocationType === type ? "#0F172A" : "#6B7280"}
                                            size={16}
                                        />
                                    ) : (
                                        <DollarSign
                                            color={formState.allocationType === type ? "#0F172A" : "#6B7280"}
                                            size={16}
                                        />
                                    )}
                                    <Text
                                        style={[
                                            styles.typeChipText,
                                            formState.allocationType === type && styles.typeChipTextActive,
                                        ]}
                                    >
                                        {type === "percentage" ? "Percentage" : "Fixed amount"}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.formField}>
                        <View style={styles.labelRow}>
                            <Text style={styles.formLabel}>{allocationLabel}</Text>
                            <Text style={styles.formHint}>{allocationSuffix}</Text>
                        </View>
                        <TextInput
                            style={styles.valueInput}
                            value={formState.value}
                            onChangeText={handleValueChange}
                            placeholder={formState.allocationType === "percentage" ? "10" : "250"}
                            placeholderTextColor="#9CA3AF"
                            keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                            returnKeyType="done"
                            maxLength={formState.allocationType === "percentage" ? 6 : 10}
                            testID="automation-form-value"
                        />
                    </View>

                    <View style={styles.formField}>
                        <View style={styles.labelRow}>
                            <Text style={styles.formLabel}>Note template</Text>
                            <Text style={styles.formHint}>Optional</Text>
                        </View>
                        <TextInput
                            style={styles.noteInput}
                            value={formState.noteTemplate}
                            onChangeText={handleNoteChange}
                            placeholder="For example: Skim {amount} to savings"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            maxLength={160}
                            testID="automation-form-note"
                        />
                        <Text style={styles.noteHelper}>
                            Use {"{amount}"}, {"{from}"}, {"{to}"} to auto-fill details
                        </Text>
                    </View>

                    {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                    <TouchableOpacity
                        style={[styles.primaryButton, isProcessing && styles.primaryButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={isProcessing}
                        testID="automation-form-submit"
                    >
                        <Text style={styles.primaryButtonText}>
                            {editingRuleId ? "Update automation" : "Create automation"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const disableCreation = accounts.length < 2;

    return (
        <View style={styles.container} testID="transfer-automation-screen">
            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
                showsVerticalScrollIndicator={false}
            >
                <LinearGradient colors={["#0F172A", "#1E3A8A"]} style={styles.heroCard}>
                    <View style={styles.heroIcon}>
                        <Sparkles color="#FDE68A" size={24} />
                    </View>
                    <Text style={styles.heroTitle}>Smart transfers</Text>
                    <Text style={styles.heroSubtitle}>
                        Route a slice of every paycheck into savings or goals without thinking about it.
                    </Text>
                    <View style={styles.heroStatsRow}>
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatLabel}>Active automations</Text>
                            <Text style={styles.heroStatValue}>{activeCount}</Text>
                        </View>
                        <View style={styles.heroDivider} />
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatLabel}>Avg. percentage</Text>
                            <Text style={styles.heroStatValue}>{percentageAverage.toFixed(1)}%</Text>
                        </View>
                        <View style={styles.heroDivider} />
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatLabel}>Fixed total</Text>
                            <Text style={styles.heroStatValue}>${fixedTotal.toFixed(0)}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <TouchableOpacity
                    style={[styles.addRuleButton, disableCreation && styles.addRuleButtonDisabled]}
                    onPress={handleOpenCreate}
                    disabled={disableCreation}
                    testID="automation-add-rule"
                >
                    <Text style={styles.addRuleText}>
                        {disableCreation ? "Create another account first" : "+ New automation"}
                    </Text>
                </TouchableOpacity>

                {banner ? (
                    <View
                        style={[styles.banner, banner.type === "error" ? styles.bannerError : styles.bannerSuccess]}
                        testID="automation-banner"
                    >
                        <Text style={styles.bannerText}>{banner.message}</Text>
                        <TouchableOpacity onPress={() => setBanner(null)}>
                            <Text style={styles.bannerClose}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {preparedRules.length === 0 ? (
                    <View style={styles.emptyState} testID="transfer-rules-empty">
                        <Text style={styles.emptyTitle}>No automations yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Create rules to skim a percentage or fixed amount from income into another account.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.rulesList}>
                        {preparedRules.map((rule: any) => (
                            <View key={rule.id} style={styles.ruleCard} testID={`transfer-rule-${rule.id}`}>
                                <View style={styles.ruleHeader}>
                                    <View style={styles.ruleAccounts}>
                                        <View style={styles.accountTag}>
                                            <View style={[styles.colorDot, { backgroundColor: rule.sourceColor }]} />
                                            <Text style={styles.accountTagText}>{rule.sourceName}</Text>
                                        </View>
                                        <ArrowRight color="#6B7280" size={18} />
                                        <View style={styles.accountTag}>
                                            <View style={[styles.colorDot, { backgroundColor: rule.targetColor }]} />
                                            <Text style={styles.accountTagText}>{rule.targetName}</Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={rule.isActive}
                                        onValueChange={(value) => handleToggleRule(rule.id, value)}
                                        trackColor={{ false: "#CBD5F5", true: "#3B82F6" }}
                                        thumbColor={rule.isActive ? "#fff" : "#fff"}
                                        testID={`transfer-rule-toggle-${rule.id}`}
                                    />
                                </View>
                                <View style={styles.ruleBody}>
                                    <Text style={styles.ruleLabel}>Allocation</Text>
                                    <Text style={styles.ruleValue}>
                                        {rule.allocationType === "percentage"
                                            ? `${rule.percentage?.toFixed(1) ?? "0.0"}%`
                                            : `$${rule.fixedAmount?.toFixed(2) ?? "0.00"}`}
                                    </Text>
                                    {rule.noteTemplate ? (
                                        <Text style={styles.ruleNote}>{rule.noteTemplate}</Text>
                                    ) : null}
                                </View>
                                <View style={styles.ruleActions}>
                                    <TouchableOpacity
                                        style={styles.ruleActionButton}
                                        onPress={() => handleOpenEdit(rule)}
                                        testID={`edit-transfer-rule-${rule.id}`}
                                    >
                                        <Edit3 color="#2563EB" size={18} />
                                        <Text style={styles.ruleActionText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.ruleActionButton}
                                        onPress={() => handleDeleteRule(rule.id)}
                                        testID={`delete-transfer-rule-${rule.id}`}
                                    >
                                        <Trash2 color="#EF4444" size={18} />
                                        <Text style={[styles.ruleActionText, styles.ruleDeleteText]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {formVisible ? renderFormModal() : null}
            {pickerType ? renderAccountPicker() : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0B1120",
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
        gap: 20,
    },
    heroCard: {
        borderRadius: 28,
        padding: 24,
        gap: 16,
    },
    heroIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: "rgba(253, 230, 138, 0.15)",
        alignItems: "center",
        justifyContent: "center",
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: "700",
        color: "#F8FAFC",
    },
    heroSubtitle: {
        fontSize: 15,
        color: "rgba(248,250,252,0.8)",
        lineHeight: 22,
    },
    heroStatsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(15,23,42,0.5)",
        borderRadius: 18,
        padding: 16,
        columnGap: 12,
    },
    heroStat: {
        flex: 1,
        alignItems: "center",
    },
    heroStatLabel: {
        fontSize: 13,
        color: "#CBD5F5",
        marginBottom: 4,
    },
    heroStatValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#F8FAFC",
    },
    heroDivider: {
        width: 1,
        height: 32,
        backgroundColor: "rgba(148,163,184,0.4)",
    },
    addRuleButton: {
        borderRadius: 20,
        paddingVertical: 16,
        alignItems: "center",
        backgroundColor: "#2563EB",
    },
    addRuleButtonDisabled: {
        backgroundColor: "#1E40AF",
        opacity: 0.5,
    },
    addRuleText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFF",
    },
    banner: {
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        columnGap: 12,
    },
    bannerSuccess: {
        backgroundColor: "rgba(16,185,129,0.2)",
    },
    bannerError: {
        backgroundColor: "rgba(239,68,68,0.2)",
    },
    bannerText: {
        color: "#F8FAFC",
        fontSize: 14,
        flex: 1,
    },
    bannerClose: {
        color: "#F8FAFC",
        fontWeight: "600",
    },
    emptyState: {
        padding: 32,
        borderRadius: 24,
        backgroundColor: "#111827",
        alignItems: "center",
        gap: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#F8FAFC",
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#94A3B8",
        textAlign: "center",
        lineHeight: 22,
    },
    rulesList: {
        gap: 16,
    },
    ruleCard: {
        backgroundColor: "#111827",
        borderRadius: 24,
        padding: 20,
        gap: 16,
    },
    ruleHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        columnGap: 12,
    },
    ruleAccounts: {
        flexDirection: "row",
        alignItems: "center",
        columnGap: 8,
    },
    accountTag: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(148,163,184,0.15)",
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 6,
        columnGap: 6,
    },
    colorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    accountTagText: {
        color: "#E2E8F0",
        fontSize: 13,
        fontWeight: "600",
    },
    ruleBody: {
        gap: 6,
    },
    ruleLabel: {
        fontSize: 13,
        color: "#9CA3AF",
    },
    ruleValue: {
        fontSize: 24,
        fontWeight: "700",
        color: "#F8FAFC",
    },
    ruleNote: {
        fontSize: 14,
        color: "#94A3B8",
        lineHeight: 20,
    },
    ruleActions: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    ruleActionButton: {
        flexDirection: "row",
        alignItems: "center",
        columnGap: 6,
    },
    ruleActionText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#2563EB",
    },
    ruleDeleteText: {
        color: "#EF4444",
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    pickerSheet: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: "70%",
        paddingBottom: 24,
    },
    pickerHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
    },
    pickerClose: {
        fontSize: 14,
        fontWeight: "600",
        color: "#2563EB",
    },
    pickerList: {
        padding: 20,
        gap: 12,
    },
    pickerItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: 18,
        backgroundColor: "#F8FAFC",
    },
    pickerItemActive: {
        borderWidth: 1.5,
        borderColor: "#2563EB",
        backgroundColor: "#EFF6FF",
    },
    pickerItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        columnGap: 12,
    },
    pickerName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0F172A",
    },
    pickerMeta: {
        fontSize: 13,
        color: "#6B7280",
    },
    formOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "flex-end",
    },
    formSheet: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        gap: 18,
        maxHeight: "90%",
    },
    formHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    formTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
    },
    formClose: {
        fontSize: 15,
        fontWeight: "600",
        color: "#2563EB",
    },
    formField: {
        gap: 10,
    },
    formLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "#0F172A",
    },
    formHint: {
        fontSize: 13,
        color: "#6B7280",
    },
    selector: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    selectorLeft: {
        flexDirection: "row",
        alignItems: "center",
        columnGap: 10,
    },
    selectorText: {
        fontSize: 16,
        color: "#0F172A",
        fontWeight: "600",
    },
    typeSwitch: {
        flexDirection: "row",
        columnGap: 8,
    },
    typeChip: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        columnGap: 8,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFF",
    },
    typeChipActive: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB",
    },
    typeChipText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    typeChipTextActive: {
        color: "#0F172A",
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    valueInput: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 18,
        padding: 16,
        fontSize: 28,
        fontWeight: "700",
        color: "#0F172A",
    },
    noteInput: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 18,
        padding: 16,
        minHeight: 90,
        textAlignVertical: "top",
        fontSize: 15,
        color: "#0F172A",
    },
    noteHelper: {
        fontSize: 13,
        color: "#6B7280",
    },
    formError: {
        fontSize: 14,
        color: "#EF4444",
        fontWeight: "600",
    },
    primaryButton: {
        borderRadius: 20,
        backgroundColor: "#2563EB",
        paddingVertical: 16,
        alignItems: "center",
    },
    primaryButtonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFF",
    },
});
