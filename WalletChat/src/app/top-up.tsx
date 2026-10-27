import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Smartphone, Landmark, type LucideIcon } from "lucide-react-native";
import { colors, fonts, palette, radius, spacing, type Tone } from "@/constants/theme";
import { ScreenHeader } from "@/components/screen-header";
import { AmountPad } from "@/components/amount-pad";
import { PrimaryButton } from "@/components/primary-button";
import { SuccessView } from "@/components/success-view";
import { FormError } from "@/components/form-error";
import { useWallet } from "@/context/wallet";
import { formatRWF } from "@/utils/formats";
import { goBack } from "@/utils/navigation";

type Source = { id: string; label: string; icon: LucideIcon; tone: Tone };

const sources: Source[] = [
  { id: "mtn", label: "MTN MoMo", icon: Smartphone, tone: "amber" },
  { id: "airtel", label: "Airtel Money", icon: Smartphone, tone: "red" },
  { id: "bank", label: "Bank", icon: Landmark, tone: "indigo" },
];

const MAX_TOP_UP = 1000000;

export default function TopUpScreen() {
  const { balance, topUp } = useWallet();
  const [sourceId, setSourceId] = useState(sources[0].id);
  const [digits, setDigits] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false); // waiting for the server
  const [error, setError] = useState("");

  const source = sources.find((s) => s.id === sourceId) ?? sources[0];
  const amount = Number(digits || "0");
  const overLimit = amount > MAX_TOP_UP;
  const canTopUp = amount > 0 && !overLimit && !busy;

  async function handleTopUp() {
    setBusy(true);
    setError("");
    try {
      await topUp(amount, source.label);
      setDone(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <SuccessView
        title="Wallet topped up"
        message={`${formatRWF(amount)} added from ${source.label}. New balance: ${formatRWF(balance)}.`}
      >
        <PrimaryButton label="Done" onPress={() => goBack()} />
      </SuccessView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Top up" />

      {/* Where the money comes from */}
      <View style={styles.sourceSection}>
        <Text style={styles.label}>From</Text>
        <View style={styles.sources}>
          {sources.map((s) => {
            const selected = s.id === sourceId;
            const Icon = s.icon;
            return (
              <Pressable
                key={s.id}
                style={[styles.source, selected && styles.sourceSelected]}
                onPress={() => setSourceId(s.id)}
                accessibilityState={{ selected }}
              >
                <View style={[styles.sourceIcon, { backgroundColor: palette[s.tone].bg }]}>
                  <Icon size={18} color={palette[s.tone].fg} />
                </View>
                <Text style={styles.sourceLabel} numberOfLines={1}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <AmountPad
        digits={digits}
        onChange={setDigits}
        error={overLimit}
        hint={overLimit ? `Max ${formatRWF(MAX_TOP_UP)} per top up` : `Balance ${formatRWF(balance)}`}
        quickAmounts={[5000, 10000, 20000]}
      />

      <FormError message={error} />

      <PrimaryButton
        label={busy ? "Topping up…" : amount > 0 ? `Top up ${formatRWF(amount)}` : "Top up"}
        disabled={!canTopUp}
        onPress={handleTopUp}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  sourceSection: { gap: spacing.md },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  sources: { flexDirection: "row", gap: spacing.sm },
  source: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sourceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  sourceIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  sourceLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
});
