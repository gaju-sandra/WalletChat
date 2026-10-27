import { useState, type ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, EyeOff, Wallet } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";

// The frame shared by the Sign in and Create account screens: logo, title, subtitle, then the form.
// It scrolls, so the keyboard never hides the fields on small phones.
export function AuthScreen({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}>
            <Wallet size={32} color="white" />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type AuthFieldProps = TextInputProps & {
  label: string;
  secret?: boolean; // a password: hidden, with an eye button to show it
};

// A label with a text box under it. Every other prop (value, onChangeText, keyboardType…) goes to the TextInput.
export function AuthField({ label, secret = false, style, ...inputProps }: AuthFieldProps) {
  const [hidden, setHidden] = useState(secret);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, secret && styles.inputWithEye, style]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          {...inputProps}
        />
        {secret ? (
          <Pressable
            style={styles.eye}
            onPress={() => setHidden((h) => !h)}
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={8}
          >
            {hidden ? <Eye size={20} color={colors.textMuted} /> : <EyeOff size={20} color={colors.textMuted} />}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// "Don't have an account? Create one" style line at the bottom of a screen
export function AuthSwitch({ question, action, onPress }: { question: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchText}>{question} </Text>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text style={styles.link}>{action}</Text>
      </Pressable>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  notice: { fontFamily: fonts.medium, fontSize: 13, color: colors.success, textAlign: "center" },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: "center" },
  links: { flexDirection: "row", justifyContent: "space-between" },
  codeInput: { textAlign: "center", letterSpacing: 8, fontSize: 22 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.text, textAlign: "center" },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: "center" },
  field: { gap: spacing.sm },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  inputRow: { justifyContent: "center" },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  inputWithEye: { paddingRight: 52 }, // room for the eye button, so text doesn't run under it
  eye: { position: "absolute", right: spacing.md, padding: spacing.xs },
  switchRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap" },
  switchText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
});
