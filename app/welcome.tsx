import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Wallet, TrendingUp, Shield } from "lucide-react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WelcomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#0EA5E9", "#3B82F6"]}
                style={styles.gradient}
            >
                <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 60 }]}>
                    <View style={styles.iconContainer}>
                        <Wallet color="#FFF" size={64} strokeWidth={1.5} />
                    </View>

                    <Text style={styles.title}>Budget Tracker</Text>
                    <Text style={styles.subtitle}>
                        Take control of your finances
                    </Text>

                    <View style={styles.features}>
                        <View style={styles.feature}>
                            <TrendingUp color="#FFF" size={24} />
                            <Text style={styles.featureText}>
                                Track your income and expenses
                            </Text>
                        </View>

                        <View style={styles.feature}>
                            <Shield color="#FFF" size={24} />
                            <Text style={styles.featureText}>
                                Data stored securely on your device
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => router.push("/create-account")}
                    >
                        <Text style={styles.buttonText}>Get Started</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 32,
        paddingTop: 100,
        paddingBottom: 60,
        justifyContent: "space-between",
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
    },
    title: {
        fontSize: 40,
        fontWeight: "700" as const,
        color: "#FFF",
        textAlign: "center",
        marginTop: 32,
    },
    subtitle: {
        fontSize: 18,
        color: "rgba(255, 255, 255, 0.9)",
        textAlign: "center",
        marginTop: 12,
    },
    features: {
        gap: 24,
        marginTop: 60,
    },
    feature: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    featureText: {
        fontSize: 16,
        color: "rgba(255, 255, 255, 0.95)",
        flex: 1,
    },
    button: {
        backgroundColor: "#FFF",
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 40,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: "600" as const,
        color: "#3B82F6",
    },
});
