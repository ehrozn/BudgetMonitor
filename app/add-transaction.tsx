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
    Modal,
    Switch,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, useCurrentAccount } from "../context/AppContext";
import type { TransactionType, RecurringTransaction } from "../types";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
    Calendar,
    PlusCircle,
    Check,
    X,
    Repeat,
    Clock,
} from "lucide-react-native";
import { hapticSelection, hapticSuccess, hapticError } from "../utils/haptics";
import {
    CATEGORY_ICON_OPTIONS,
    getCategoryIconComponent,
} from "../constants/categoryIcons";
import type { CategoryIconName } from "../constants/categoryIcons";

const REPEAT_INTERVAL_OPTIONS: { label: string; value: RecurringTransaction["repeatInterval"]; description: string }[] = [
    { label: "Daily", value: "daily", description: "Every day" },
    { label: "Weekly", value: "weekly", description: "Same weekday" },
    { label: "Monthly", value: "monthly", description: "Same date" },
    { label: "Yearly", value: "yearly", description: "Same day each year" },
];

const END_OPTIONS: { label: string; value: RecurringTransaction["endType"]; helper: string }[] = [
    { label: "Never", value: "never", helper: "Keeps running" },
    { label: "On date", value: "endDate", helper: "Pick a finish" },
    { label: "After", value: "occurrences", helper: "Stop after x times" },
];

export default function AddTransactionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ type?: string }>();
    const {
        addTransaction,
        getCategoriesByType,
        addCategory,
        addRecurringTransaction,
    } = useApp();
    const currentAccount = useCurrentAccount();
    const insets = useSafeAreaInsets();

    const transactionType = (params.type || "expense") as TransactionType;
    const categories = getCategoriesByType(transactionType);

    const [amount, setAmount] = useState<string>("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || "");
    const [transactionName, setTransactionName] = useState<string>("");
    const [note, setNote] = useState<string>("");
    const [date, setDate] = useState<Date>(new Date());
    const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
    const [pendingDate, setPendingDate] = useState<Date>(new Date());
    const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
    const [error, setError] = useState<string>("");
    const defaultIcon = (CATEGORY_ICON_OPTIONS[0]?.value ?? "Briefcase") as CategoryIconName;
    const [isCategoryModalVisible, setIsCategoryModalVisible] = useState<boolean>(false);
    const [newCategoryName, setNewCategoryName] = useState<string>("");
    const [newCategoryIcon, setNewCategoryIcon] = useState<CategoryIconName>(defaultIcon);
    const [categoryModalError, setCategoryModalError] = useState<string>("");

    const [isRecurring, setIsRecurring] = useState<boolean>(false);
    const [repeatInterval, setRepeatInterval] = useState<RecurringTransaction["repeatInterval"]>("monthly");
    const [repeatDay, setRepeatDay] = useState<number | null>(null);
    const [endType, setEndType] = useState<RecurringTransaction["endType"]>("never");
    const [endDateValue, setEndDateValue] = useState<Date | null>(null);
    const [showEndDatePicker, setShowEndDatePicker] = useState<boolean>(false);
    const [occurrenceCount, setOccurrenceCount] = useState<string>("");
    const [timezone] = useState<string>(() => {
        try {
            const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
            return resolved || "UTC";
        } catch {
            return "UTC";
        }
    });

    useEffect(() => {
        if (categories.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(categories[0].id);
        }
    }, [categories, selectedCategoryId]);

    useEffect(() => {
        if (isRecurring && repeatInterval === "monthly" && repeatDay === null) {
            setRepeatDay(date.getDate());
        }
    }, [isRecurring, repeatInterval, repeatDay, date]);

    const formattedMainDate = useMemo(() => {
        return date.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }, [date]);

    const formattedEndDate = useMemo(() => {
        if (!endDateValue) {
            return "Pick a date";
        }
        return endDateValue.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }, [endDateValue]);

    const handleAmountChange = (text: string) => {
        const cleaned = text.replace(/[^0-9.]/g, "");
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

    const handleDateModeChange = (mode: "date" | "time") => {
        if (datePickerMode === mode) {
            return;
        }
        hapticSelection();
        setDatePickerMode(mode);
    };

    const handleDateConfirm = () => {
        setDate(pendingDate);
        resetRecurringErrors();
        setShowDatePickerModal(false);
        hapticSelection();
    };

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS !== "ios" && event.type === "dismissed") {
            return;
        }
        if (selectedDate) {
            setPendingDate(selectedDate);
        }
    };

    const handleOpenCategoryModal = () => {
        hapticSelection();
        setNewCategoryName("");
        setNewCategoryIcon(defaultIcon);
        setCategoryModalError("");
        setIsCategoryModalVisible(true);
    };

    const handleCloseCategoryModal = () => {
        setIsCategoryModalVisible(false);
        setCategoryModalError("");
        setNewCategoryName("");
        setNewCategoryIcon(defaultIcon);
    };

    const handleIconSelect = (iconName: CategoryIconName) => {
        hapticSelection();
        setNewCategoryIcon(iconName);
    };

    const handleCreateCategory = () => {
        const trimmedName = newCategoryName.trim();

        if (!trimmedName) {
            setCategoryModalError("Enter category name.");
            hapticError();
            return;
        }

        const createdCategory = addCategory(
            transactionType,
            trimmedName,
            newCategoryIcon,
        );

        if (!createdCategory) {
            setCategoryModalError("Could not create category. Try again.");
            hapticError();
            return;
        }

        setSelectedCategoryId(createdCategory.id);
        hapticSuccess();
        handleCloseCategoryModal();
    };

    const resetRecurringErrors = () => {
        setError("");
    };

    const validateRecurring = (amountNum: number) => {
        if (!isRecurring) {
            return { occurrencesValue: null as number | null, endDateIso: null as string | null, repeatDayValue: null as number | null };
        }

        if (amountNum <= 0) {
            setError("Enter a valid amount before scheduling repeats");
            hapticError();
            throw new Error("invalid");
        }

        let occurrencesValue: number | null = null;
        let endDateIso: string | null = null;
        let repeatDayValue: number | null = null;

        if (repeatInterval === "monthly") {
            const daySource = repeatDay ?? date.getDate();
            if (daySource < 1 || daySource > 31) {
                setError("Choose a repeat day between 1 and 31");
                hapticError();
                throw new Error("invalid");
            }
            repeatDayValue = daySource;
        }

        if (endType === "endDate") {
            if (!endDateValue) {
                setError("Select an end date");
                hapticError();
                throw new Error("invalid");
            }
            const startMidnight = new Date(date);
            startMidnight.setHours(0, 0, 0, 0);
            const endMidnight = new Date(endDateValue);
            endMidnight.setHours(0, 0, 0, 0);
            if (endMidnight < startMidnight) {
                setError("End date must be on or after the start date");
                hapticError();
                throw new Error("invalid");
            }
            endDateIso = endDateValue.toISOString();
        }

        if (endType === "occurrences") {
            const parsed = Number.parseInt(occurrenceCount, 10);
            if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 500) {
                setError("Set occurrences between 1 and 500");
                hapticError();
                throw new Error("invalid");
            }
            occurrencesValue = parsed;
        }

        return { occurrencesValue, endDateIso, repeatDayValue };
    };

    const handleSave = () => {
        if (!currentAccount) {
            setError("No account selected");
            hapticError();
            return;
        }

        const amountNum = Number.parseFloat(amount);
        if (Number.isNaN(amountNum) || amountNum <= 0) {
            setError("Enter a valid amount (greater than 0)");
            hapticError();
            return;
        }

        if (amountNum > 999999999) {
            setError("Amount is too large");
            hapticError();
            return;
        }

        if (!selectedCategoryId) {
            setError("Please select a category");
            hapticError();
            return;
        }

        try {
            const { occurrencesValue, endDateIso, repeatDayValue } = validateRecurring(amountNum);

            const created = addTransaction(
                currentAccount.id,
                transactionType,
                amountNum,
                selectedCategoryId,
                date.toISOString(),
                note || null,
                null,
                {
                    transactionName: transactionName.trim() || null,
                }
            );

            if (!created) {
                setError("Could not save transaction");
                hapticError();
                return;
            }

            if (isRecurring) {
                const recurring = addRecurringTransaction(
                    {
                        accountId: currentAccount.id,
                        type: transactionType,
                        amount: amountNum,
                        categoryId: selectedCategoryId,
                        customCategoryName: null,
                        note: note ? note.trim() : null,
                        startDate: date.toISOString(),
                        repeatInterval,
                        repeatDay: repeatInterval === "monthly" ? repeatDayValue : null,
                        endType,
                        endDate: endDateIso,
                        occurrences: occurrencesValue,
                        timezone,
                        isActive: true,
                    },
                    { initialOccurrenceCaptured: true },
                );

                if (!recurring) {
                    setError("Could not schedule recurring entry");
                    hapticError();
                    return;
                }
            }

            hapticSuccess();
            router.back();
        } catch {
            return;
        }
    };

    if (!currentAccount) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>No account found</Text>
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
                                onChangeText={handleAmountChange}
                                placeholder="0.00"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="decimal-pad"
                                autoFocus
                                returnKeyType="done"
                                maxLength={12}
                                testID="amount-input"
                            />
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Category *</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categories}
                        >
                            {categories.map((category) => {
                                const CategoryIcon = getCategoryIconComponent(category.icon);
                                const isSelected = selectedCategoryId === category.id;

                                return (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[
                                            styles.categoryButton,
                                            isSelected && styles.categoryButtonActive,
                                        ]}
                                        onPress={() => {
                                            hapticSelection();
                                            setSelectedCategoryId(category.id);
                                        }}
                                        testID={`category-option-${category.id}`}
                                    >
                                        <View style={styles.categoryButtonContent}>
                                            <CategoryIcon
                                                color={isSelected ? "#1D4ED8" : "#6B7280"}
                                                size={18}
                                            />
                                            <Text
                                                style={[
                                                    styles.categoryButtonText,
                                                    isSelected && styles.categoryButtonTextActive,
                                                ]}
                                            >
                                                {category.name}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}

                            <TouchableOpacity
                                style={styles.addCategoryButton}
                                onPress={handleOpenCategoryModal}
                                testID="open-category-modal"
                            >
                                <PlusCircle color="#1D4ED8" size={20} />
                                <Text style={styles.addCategoryButtonText}>New</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Transaction Name (optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={transactionName}
                            onChangeText={setTransactionName}
                            placeholder="e.g. Monthly Salary"
                            placeholderTextColor="#9CA3AF"
                            maxLength={50}
                            testID="transaction-name-input"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Date *</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => {
                                hapticSelection();
                                setPendingDate(date);
                                setDatePickerMode("date");
                                setShowDatePickerModal(true);
                            }}
                            testID="open-date-picker"
                        >
                            <Calendar color="#6B7280" size={20} />
                            <Text style={styles.dateButtonText}>{formattedMainDate}</Text>
                        </TouchableOpacity>
                    </View>


                    <View style={styles.field}>
                        <Text style={styles.label}>Note (optional)</Text>
                        <TextInput
                            style={[styles.input, styles.noteInput]}
                            value={note}
                            onChangeText={(value) => {
                                setNote(value);
                                if (error) {
                                    resetRecurringErrors();
                                }
                            }}
                            placeholder="Add a note..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            maxLength={200}
                            numberOfLines={3}
                            testID="note-input"
                        />
                        {note.length > 0 && (
                            <Text style={styles.charCount}>{note.length}/200</Text>
                        )}
                    </View>

                    <View style={styles.recurringCard}>
                        <View style={styles.recurringHeader}>
                            <View style={styles.recurringHeaderText}>
                                <Text style={styles.recurringTitle}>Repeat</Text>
                                <Text style={styles.recurringSubtitle}>Schedule automatic entries</Text>
                            </View>
                            <Switch
                                value={isRecurring}
                                onValueChange={(value) => {
                                    hapticSelection();
                                    setIsRecurring(value);
                                    resetRecurringErrors();
                                }}
                                trackColor={{ true: "#2563EB", false: "#CBD5F5" }}
                                thumbColor={isRecurring ? "#FFFFFF" : "#F9FAFB"}
                                testID="toggle-recurring"
                            />
                        </View>

                        {isRecurring ? (
                            <View style={styles.recurringContent}>
                                <View style={styles.recurringSection}>
                                    <Text style={styles.sectionLabel}>Frequency</Text>
                                    <View style={styles.optionRow}>
                                        {REPEAT_INTERVAL_OPTIONS.map((option) => {
                                            const active = repeatInterval === option.value;
                                            return (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={[styles.optionPill, active && styles.optionPillActive]}
                                                    onPress={() => {
                                                        hapticSelection();
                                                        setRepeatInterval(option.value);
                                                        if (option.value !== "monthly") {
                                                            setRepeatDay(null);
                                                        } else if (repeatDay === null) {
                                                            setRepeatDay(date.getDate());
                                                        }
                                                        resetRecurringErrors();
                                                    }}
                                                    testID={`repeat-interval-${option.value}`}
                                                >
                                                    <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>
                                                        {option.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                    <Text style={styles.sectionHelper}>
                                        {REPEAT_INTERVAL_OPTIONS.find((item) => item.value === repeatInterval)?.description}
                                    </Text>
                                </View>

                                {repeatInterval === "monthly" ? (
                                    <View style={styles.recurringSection}>
                                        <Text style={styles.sectionLabel}>Monthly on</Text>
                                        <View style={styles.inlineInputRow}>
                                            <View style={styles.inlineIconChip}>
                                                <Repeat color="#1D4ED8" size={18} />
                                            </View>
                                            <TextInput
                                                style={[styles.inlineInput, styles.inlineNumericInput]}
                                                value={repeatDay === null ? "" : String(repeatDay)}
                                                onChangeText={(value) => {
                                                    const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
                                                    if (Number.isNaN(parsed)) {
                                                        setRepeatDay(null);
                                                    } else {
                                                        setRepeatDay(Math.min(Math.max(parsed, 1), 31));
                                                    }
                                                    resetRecurringErrors();
                                                }}
                                                placeholder={String(date.getDate())}
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="number-pad"
                                                maxLength={2}
                                                testID="repeat-day-input"
                                            />
                                            <Text style={styles.inlineSuffix}>day</Text>
                                        </View>
                                    </View>
                                ) : null}

                                <View style={styles.recurringSection}>
                                    <Text style={styles.sectionLabel}>Ends</Text>
                                    <View style={styles.optionRow}>
                                        {END_OPTIONS.map((option) => {
                                            const active = endType === option.value;
                                            return (
                                                <TouchableOpacity
                                                    key={option.value}
                                                    style={[styles.optionPill, active && styles.optionPillActive]}
                                                    onPress={() => {
                                                        hapticSelection();
                                                        setEndType(option.value);
                                                        if (option.value !== "endDate") {
                                                            setEndDateValue(null);
                                                        }
                                                        if (option.value !== "occurrences") {
                                                            setOccurrenceCount("");
                                                        }
                                                        resetRecurringErrors();
                                                    }}
                                                    testID={`end-type-${option.value}`}
                                                >
                                                    <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>
                                                        {option.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                    <Text style={styles.sectionHelper}>
                                        {END_OPTIONS.find((item) => item.value === endType)?.helper}
                                    </Text>
                                </View>

                                {endType === "endDate" ? (
                                    <View style={styles.recurringSection}>
                                        <Text style={styles.sectionLabel}>End date</Text>
                                        <TouchableOpacity
                                            style={styles.secondaryDateButton}
                                            onPress={() => {
                                                hapticSelection();
                                                setShowEndDatePicker(true);
                                            }}
                                            testID="open-end-date-picker"
                                        >
                                            <Calendar color="#2563EB" size={18} />
                                            <Text style={styles.secondaryDateText}>{formattedEndDate}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}

                                {endType === "occurrences" ? (
                                    <View style={styles.recurringSection}>
                                        <Text style={styles.sectionLabel}>Occurrences</Text>
                                        <View style={styles.inlineInputRow}>
                                            <View style={styles.inlineIconChip}>
                                                <Clock color="#1D4ED8" size={18} />
                                            </View>
                                            <TextInput
                                                style={[styles.inlineInput, styles.inlineNumericInput]}
                                                value={occurrenceCount}
                                                onChangeText={(value) => {
                                                    const cleaned = value.replace(/[^0-9]/g, "");
                                                    setOccurrenceCount(cleaned.slice(0, 3));
                                                    resetRecurringErrors();
                                                }}
                                                placeholder="e.g. 12"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="number-pad"
                                                maxLength={3}
                                                testID="occurrence-input"
                                            />
                                            <Text style={styles.inlineSuffix}>times</Text>
                                        </View>
                                    </View>
                                ) : null}
                            </View>
                        ) : null}
                    </View>

                    {error ? <Text style={styles.errorMessage}>{error}</Text> : null}
                </View>

                <View style={styles.buttons}>
                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={() => router.back()}
                        testID="cancel-transaction"
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.saveButton]}
                        onPress={handleSave}
                        testID="save-transaction"
                    >
                        <Text style={styles.saveButtonText}>Save</Text>
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
                                    testID="date-mode-date"
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
                                    testID="date-mode-time"
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
                                testID="cancel-date-picker"
                            >
                                <Text style={styles.dateModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dateModalActionButton, styles.dateModalConfirmButton]}
                                onPress={handleDateConfirm}
                                testID="confirm-date-picker"
                            >
                                <Text style={styles.dateModalConfirmText}>Set</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={isCategoryModalVisible}
                animationType="slide"
                onRequestClose={handleCloseCategoryModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New category</Text>
                            <TouchableOpacity
                                onPress={handleCloseCategoryModal}
                                style={styles.modalCloseButton}
                                testID="close-category-modal"
                            >
                                <X color="#6B7280" size={20} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.modalInput}
                            value={newCategoryName}
                            onChangeText={(value) => {
                                setNewCategoryName(value);
                                if (categoryModalError) {
                                    setCategoryModalError("");
                                }
                            }}
                            placeholder="Category name"
                            placeholderTextColor="#9CA3AF"
                            maxLength={32}
                            autoFocus
                            testID="new-category-name"
                        />

                        <Text style={styles.modalSectionLabel}>Icon</Text>
                        <ScrollView
                            contentContainerStyle={styles.iconGrid}
                            showsVerticalScrollIndicator={false}
                        >
                            {CATEGORY_ICON_OPTIONS.map((option) => {
                                const IconComponent = getCategoryIconComponent(option.value);
                                const isSelected = newCategoryIcon === option.value;

                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[styles.iconOption, isSelected && styles.iconOptionSelected]}
                                        onPress={() => handleIconSelect(option.value)}
                                        testID={`category-icon-${option.value}`}
                                    >
                                        <IconComponent
                                            color={isSelected ? "#1D4ED8" : "#6B7280"}
                                            size={20}
                                        />
                                        <Text
                                            style={[styles.iconOptionLabel, isSelected && styles.iconOptionLabelSelected]}
                                            numberOfLines={1}
                                        >
                                            {option.label}
                                        </Text>
                                        {isSelected ? (
                                            <View style={styles.iconCheckmark}>
                                                <Check color="#FFF" size={14} />
                                            </View>
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {categoryModalError ? (
                            <Text style={styles.modalErrorText}>{categoryModalError}</Text>
                        ) : null}

                        <TouchableOpacity
                            style={styles.modalPrimaryButton}
                            onPress={handleCreateCategory}
                            testID="create-category-button"
                        >
                            <Text style={styles.modalPrimaryButtonText}>Save category</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {showEndDatePicker ? (
                <DateTimePicker
                    value={endDateValue ?? date}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                        setShowEndDatePicker(Platform.OS === "ios");
                        if (selectedDate) {
                            setEndDateValue(selectedDate);
                            resetRecurringErrors();
                        }
                    }}
                    minimumDate={date}
                />
            ) : null}
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
        alignItems: "center",
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
    categoryButtonContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    categoryButtonText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    categoryButtonTextActive: {
        color: "#3B82F6",
    },
    addCategoryButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: "#BFDBFE",
        borderStyle: "dashed",
        backgroundColor: "#E0F2FE",
    },
    addCategoryButtonText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#1D4ED8",
    },
    charCount: {
        fontSize: 12,
        color: "#9CA3AF",
        textAlign: "right" as const,
        marginTop: 4,
    },
    recurringCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 18,
        gap: 16,
        shadowColor: "#0F172A",
        shadowOpacity: 0.05,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
    },
    recurringHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    recurringHeaderText: {
        gap: 4,
    },
    recurringTitle: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: "#111827",
    },
    recurringSubtitle: {
        fontSize: 14,
        color: "#6B7280",
    },
    recurringContent: {
        gap: 18,
    },
    recurringSection: {
        gap: 8,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#374151",
        textTransform: "uppercase" as const,
        letterSpacing: 0.6,
    },
    sectionHelper: {
        fontSize: 13,
        color: "#6B7280",
    },
    optionRow: {
        flexDirection: "row",
        flexWrap: "wrap" as const,
        gap: 8,
    },
    optionPill: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#F9FAFB",
    },
    optionPillActive: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB",
    },
    optionPillText: {
        fontSize: 13,
        fontWeight: "600" as const,
        color: "#4B5563",
    },
    optionPillTextActive: {
        color: "#FFFFFF",
    },
    inlineInputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    inlineIconChip: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#EEF2FF",
        alignItems: "center",
        justifyContent: "center",
    },
    inlineInput: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFF",
        paddingHorizontal: 12,
        fontSize: 16,
        color: "#111827",
    },
    inlineNumericInput: {
        textAlign: "center" as const,
    },
    inlineSuffix: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#4B5563",
    },
    secondaryDateButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#EEF2FF",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    secondaryDateText: {
        fontSize: 15,
        fontWeight: "600" as const,
        color: "#1D4ED8",
    },
    errorMessage: {
        fontSize: 14,
        color: "#EF4444",
    },
    errorText: {
        fontSize: 16,
        color: "#EF4444",
        textAlign: "center",
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(17, 24, 39, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: "85%",
        gap: 16,
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
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F3F4F6",
    },
    modalInput: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: "#111827",
    },
    modalSectionLabel: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: "#6B7280",
        textTransform: "uppercase" as const,
        letterSpacing: 0.6,
    },
    iconGrid: {
        flexDirection: "row",
        flexWrap: "wrap" as const,
        gap: 12,
    },
    iconOption: {
        width: "31%",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 12,
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FFFFFF",
    },
    iconOptionSelected: {
        borderColor: "#2563EB",
        backgroundColor: "#EFF6FF",
    },
    iconOptionLabel: {
        fontSize: 12,
        fontWeight: "600" as const,
        color: "#6B7280",
    },
    iconOptionLabelSelected: {
        color: "#1D4ED8",
    },
    iconCheckmark: {
        position: "absolute" as const,
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#1D4ED8",
        alignItems: "center",
        justifyContent: "center",
    },
    modalErrorText: {
        fontSize: 14,
        color: "#EF4444",
    },
    modalPrimaryButton: {
        backgroundColor: "#1D4ED8",
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
    },
    modalPrimaryButtonText: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: "#FFFFFF",
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
        alignItems: "center",
        justifyContent: "space-between",
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
