import { useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
    ChevronLeft,
    Languages,
    DollarSign,
    Palette,
    Plus,
    Trash2,
    Check,
} from "lucide-react-native";
// TODO: Missing modules - waiting for user input or placeholders
// import { useApp } from "../../../context/AppContext";
// import { hapticLight, hapticSuccess } from "../../../utils/haptics";
// import { CATEGORY_ICON_OPTIONS, getCategoryIconComponent, CategoryIconName } from "../../../constants/categoryIcons";
// import type { TransactionType } from "../../../types";

// TEMPORARY PLACEHOLDERS TO MAKE IT COMPILE
const useApp = () => ({
    settings: { language: 'en', currency: 'USD' },
    updateSettings: () => { },
    categories: [],
    addCategory: () => true,
    deleteCategory: () => ({ success: true }),
});
const hapticLight = () => { };
const hapticSuccess = () => { };
const CATEGORY_ICON_OPTIONS = [{ value: 'Wallet', label: 'Wallet' }];
const getCategoryIconComponent = (name) => {
    const { Wallet } = require('lucide-react-native');
    return Wallet;
};
type CategoryIconName = string;
type TransactionType = 'income' | 'expense';


const availableLanguages: { key: string; label: string }[] = [
    { key: "en", label: "English" },
    { key: "ru", label: "Русский" },
];

const iconPalette = CATEGORY_ICON_OPTIONS.slice(0, 14);

export default function AppPreferencesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { settings, updateSettings, categories, addCategory, deleteCategory } = useApp();

    const [language, setLanguage] = useState<string>(settings.language);
    const [currencyInput, setCurrencyInput] = useState<string>(settings.currency);
    const [isSavingPrefs, setIsSavingPrefs] = useState<boolean>(false);

    const [categoryType, setCategoryType] = useState<TransactionType>("income");
    const [categoryName, setCategoryName] = useState<string>("");
    const [iconChoice, setIconChoice] = useState<CategoryIconName>(iconPalette[0]?.value ?? "Wallet");
    const [categoryError, setCategoryError] = useState<string | null>(null);
    const [categoryLoading, setCategoryLoading] = useState<boolean>(false);

    const languageChipPressed = useCallback(
        (value: string) => {
            hapticLight();
            setLanguage(value);
        },
        []
    );

    const handlePreferencesSave = useCallback(async () => {
        const sanitizedCurrency = currencyInput.trim().toUpperCase();
        if (sanitizedCurrency.length < 3 || sanitizedCurrency.length > 4) {
            setCategoryError("Currency code must be 3-4 letters.");
            return;
        }

        setIsSavingPrefs(true);
        setCategoryError(null);
        try {
            updateSettings({ language, currency: sanitizedCurrency });
            hapticSuccess();
        } finally {
            setIsSavingPrefs(false);
        }
    }, [currencyInput, language, updateSettings]);

    const handleCategoryAdd = useCallback(async () => {
        if (!categoryName.trim()) {
            setCategoryError("Enter category name.");
            return;
        }

        setCategoryError(null);
        setCategoryLoading(true);
        try {
            const created = addCategory(categoryType, categoryName.trim(), iconChoice);
            if (!created) {
                setCategoryError("Category already exists.");
                return;
            }
            setCategoryName("");
            hapticSuccess();
        } finally {
            setCategoryLoading(false);
        }
    }, [categoryType, categoryName, iconChoice, addCategory]);

    const handleCategoryDelete = useCallback(
        (categoryId: string) => {
            const result = deleteCategory(categoryId);
            if (!result.success && result.error) {
                setCategoryError(result.error);
                return;
            }
            hapticSuccess();
        },
        [deleteCategory]
    );

    const filteredCategories = useMemo(() => {
        return categories.filter((category) => category.type === categoryType);
    }, [categories, categoryType]);

    return (
        <View style={styles.wrapper}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.select({ ios: "padding", default: undefined })}
            >
                <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
                    <TouchableOpacity
                        onPress={() => {
                            hapticLight();
                            router.back();
                        }}
                        style={styles.backButton}
                        testID="app-preferences-back"
                    >
                        <ChevronLeft color="#111827" size={24} />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>App preferences</Text>
                        <Text style={styles.headerSubtitle}>Personalize language, currency, and categories.</Text>
                    </View>
                </View>

                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 60 }}
                >
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}>
                                <Languages color="#1D4ED8" size={20} />
                            </View>
                            <Text style={styles.cardTitle}>Language</Text>
                        </View>
                        <View style={styles.chipRow}>
                            {availableLanguages.map((item) => {
                                const isActive = language === item.key;
                                return (
                                    <TouchableOpacity
                                        key={item.key}
                                        style={[styles.chip, isActive && styles.chipActive]}
                                        onPress={() => languageChipPressed(item.key)}
                                        testID={`preferences-language-${item.key}`}
                                    >
                                        <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                                            {item.label}
                                        </Text>
                                        {isActive ? <Check size={16} color="#FFFFFF" /> : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconCircle, { backgroundColor: "#DCFCE7" }]}>
                                <DollarSign color="#15803D" size={20} />
                            </View>
                            <Text style={styles.cardTitle}>Currency</Text>
                        </View>
                        <Text style={styles.cardSubtitle}>Display currency for balances and reports.</Text>
                        <TextInput
                            value={currencyInput}
                            onChangeText={(value) => {
                                setCurrencyInput(value.replace(/[^a-zA-Z]/g, ""));
                            }}
                            style={styles.input}
                            placeholder="USD"
                            autoCapitalize="characters"
                            autoCorrect={false}
                            maxLength={4}
                            testID="preferences-currency"
                        />
                        <TouchableOpacity
                            style={[styles.primaryButton, isSavingPrefs && styles.primaryButtonDisabled]}
                            onPress={handlePreferencesSave}
                            disabled={isSavingPrefs}
                            testID="preferences-save"
                        >
                            {isSavingPrefs ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Save preferences</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconCircle, { backgroundColor: "#FCE7F3" }]}>
                                <Palette color="#C026D3" size={20} />
                            </View>
                            <Text style={styles.cardTitle}>Custom categories</Text>
                        </View>
                        <View style={styles.segmentRow}>
                            {["income", "expense"].map((type) => {
                                const typed = type as TransactionType;
                                const isActive = categoryType === typed;
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={[styles.segment, isActive && styles.segmentActive]}
                                        onPress={() => {
                                            hapticLight();
                                            setCategoryType(typed);
                                        }}
                                        testID={`preferences-category-type-${type}`}
                                    >
                                        <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                                            {type === "income" ? "Income" : "Expense"}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.cardSubtitle}>Add your own categories to match your lifestyle.</Text>
                        <TextInput
                            value={categoryName}
                            onChangeText={setCategoryName}
                            style={styles.input}
                            placeholder="Category name"
                            placeholderTextColor="#9CA3AF"
                            autoCorrect={false}
                            testID="preferences-category-name"
                        />

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
                            {iconPalette.map((icon) => {
                                const IconComponent = getCategoryIconComponent(icon.value);
                                const isActive = iconChoice === icon.value;
                                return (
                                    <TouchableOpacity
                                        key={icon.value}
                                        style={[styles.iconChip, isActive && styles.iconChipActive]}
                                        onPress={() => {
                                            hapticLight();
                                            setIconChoice(icon.value);
                                        }}
                                        testID={`preferences-icon-${icon.value}`}
                                    >
                                        <IconComponent color={isActive ? "#FFFFFF" : "#1F2937"} size={20} />
                                        <Text style={[styles.iconChipLabel, isActive && styles.iconChipLabelActive]}>
                                            {icon.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.secondaryButton, categoryLoading && styles.secondaryButtonDisabled]}
                            onPress={handleCategoryAdd}
                            disabled={categoryLoading}
                            testID="preferences-add-category"
                        >
                            {categoryLoading ? (
                                <ActivityIndicator color="#2563EB" />
                            ) : (
                                <View style={styles.buttonContent}>
                                    <Plus size={18} color="#2563EB" />
                                    <Text style={styles.secondaryButtonText}>Add category</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.categoryList}>
                            {filteredCategories.map((category) => {
                                const IconComponent = getCategoryIconComponent(category.icon);
                                return (
                                    <View key={category.id} style={styles.categoryItem}>
                                        <View style={styles.categoryIconBubble}>
                                            <IconComponent color="#2563EB" size={18} />
                                        </View>
                                        <Text style={styles.categoryName}>{category.name}</Text>
                                        {category.isUserDefined ? (
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() => handleCategoryDelete(category.id)}
                                                testID={`preferences-delete-category-${category.id}`}
                                            >
                                                <Trash2 color="#DC2626" size={18} />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>

                        {categoryError ? (
                            <View style={styles.errorCard} testID="preferences-error">
                                <Text style={styles.errorText}>{categoryError}</Text>
                            </View>
                        ) : null}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        fontSize: 28,
        fontWeight: "700" as const,
        color: "#0F172A",
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#64748B",
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: "#0F172A",
        shadowOpacity: 0.04,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#111827",
    },
    cardSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 16,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    chipRow: {
        flexDirection: "row",
        gap: 12,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: "#F1F5F9",
    },
    chipActive: {
        backgroundColor: "#2563EB",
    },
    chipLabel: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#1F2937",
    },
    chipLabelActive: {
        color: "#FFFFFF",
    },
    input: {
        backgroundColor: "#F8FAFC",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 16,
        color: "#0F172A",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 16,
    },
    primaryButton: {
        backgroundColor: "#2563EB",
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryButtonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFFFFF",
    },
    segmentRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    segment: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#CBD5F5",
        backgroundColor: "#F8FAFC",
    },
    segmentActive: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB",
    },
    segmentLabel: {
        fontSize: 15,
        fontWeight: "600" as const,
        color: "#1F2937",
    },
    segmentLabelActive: {
        color: "#FFFFFF",
    },
    iconRow: {
        paddingVertical: 8,
        gap: 12,
    },
    iconChip: {
        width: 88,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FFFFFF",
    },
    iconChipActive: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB",
    },
    iconChipLabel: {
        fontSize: 12,
        color: "#1F2937",
        textAlign: "center",
    },
    iconChipLabelActive: {
        color: "#FFFFFF",
    },
    secondaryButton: {
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#2563EB",
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 8,
    },
    secondaryButtonDisabled: {
        opacity: 0.6,
    },
    buttonContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#2563EB",
    },
    categoryList: {
        marginTop: 16,
        gap: 12,
    },
    categoryItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    categoryIconBubble: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#EFF6FF",
        alignItems: "center",
        justifyContent: "center",
    },
    categoryName: {
        flex: 1,
        fontSize: 15,
        color: "#0F172A",
        fontWeight: "600" as const,
    },
    deleteButton: {
        padding: 6,
        borderRadius: 12,
        backgroundColor: "#FEE2E2",
    },
    errorCard: {
        marginTop: 16,
        backgroundColor: "#FEF2F2",
        borderRadius: 16,
        padding: 16,
    },
    errorText: {
        fontSize: 14,
        color: "#B91C1C",
        fontWeight: "600" as const,
    },
});
