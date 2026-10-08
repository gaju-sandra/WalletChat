import { View, Text, StyleSheet } from "react-native";
import { palette, fonts, radius, type Tone } from "@/constants/theme";

type AvatarProps = {
  initials: string;
  tone?: Tone;   // ? = optional
  size?: number;
};

export function Avatar({ initials, tone = "teal", size = 52 }: AvatarProps) {
  const { bg, fg } = palette[tone];

  return (
    <View style={[styles.circle, { width: size, height: size, backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg, fontSize: size * 0.3 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  text: { fontFamily: fonts.semibold },
});