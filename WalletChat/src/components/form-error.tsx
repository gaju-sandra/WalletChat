import { Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/constants/theme";

// A red line for errors from the server ("Not enough balance") or the form. Shows nothing when empty.
export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, textAlign: "center" },
});
