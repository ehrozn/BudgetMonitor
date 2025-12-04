import { View, Text, StyleSheet } from 'react-native';

export default function SubAccountsScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Sub Accounts Screen Placeholder</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18 },
});
