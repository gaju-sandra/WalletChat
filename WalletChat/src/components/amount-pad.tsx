import { View, Text, StyleSheet, Pressable } from "react-native";
import { Delete } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { formatRWF } from "@/utils/formats";

const MAX_DIGITS = 9;
const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "back"];

type AmountPadProps = {
  digits: string; // what has been typed so far, e.g. "5000"
  onChange: (digits: string) => void;
  hint: string; // small line under the amount
  error?: boolean; // turns the amount and hint red
  quickAmounts?: number[];
};

export function AmountPad({
  digits,
  onChange,
  hint,
  error = false,
  quickAmounts = [1000, 5000, 10000],
}: AmountPadProps) {
  const amount = Number(digits || "0");

  function pressKey(key: string) {
    if (key === "back") {
      onChange(digits.slice(0, -1));
      return;
    }
    if (digits === "" && key.startsWith("0")) return; // no leading zeros
    onChange((digits + key).slice(0, MAX_DIGITS));
  }

  return (
    <>
      <View style={styles.amountSection}>
        <Text style={[styles.amount, amount === 0 && styles.amountEmpty, error && styles.errorText]}>
          {formatRWF(amount)}
        </Text>
        <Text style={[styles.hint, error && styles.errorText]}>{hint}</Text>
        <View style={styles.chips}>
          {quickAmounts.map((value) => (
            <Pressable key={value} style={styles.chip} onPress={() => onChange(String(value))}>
              <Text style={styles.chipText}>{value.toLocaleString("en-US")}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.keypad}>
        {keys.map((key) => (
          <Pressable
            key={key}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            onPress={() => pressKey(key)}
            onLongPress={key === "back" ? () => onChange("") : undefined}
            accessibilityLabel={key === "back" ? "Delete digit" : key}
          >
            {key === "back" ? (
              <Delete size={22} color={colors.text} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  amountSection: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  amount: { fontFamily: fonts.display, fontSize: 40, color: colors.text },
  amountEmpty: { color: colors.textMuted },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  errorText: { color: colors.danger },
  chips: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  keypad: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.xs },
  key: { width: "33.333%", height: 56, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  keyPressed: { backgroundColor: colors.divider },
  keyText: { fontFamily: fonts.medium, fontSize: 24, color: colors.text },
});
