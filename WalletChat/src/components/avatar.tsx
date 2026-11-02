import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { palette, fonts, radius, type Tone } from "@/constants/theme";

type AvatarProps = {
  initials: string;
  tone?: Tone;   // ? = optional
  size?: number;
  imageUrl?: string; // a profile picture; without one, the initials show
};

export function Avatar({ initials, tone = "teal", size = 52, imageUrl }: AvatarProps) {
  const { bg, fg } = palette[tone];

  return (
    <View style={[styles.circle, { width: size, height: size, backgroundColor: bg }]}>
      {imageUrl ? (
        // expo-image keeps downloaded pictures on the phone, so they show instantly the next time.
        // The initials' circle stays behind it while the picture loads.
        <Image source={imageUrl} style={styles.image} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={[styles.text, { color: fg, fontSize: size * 0.3 }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: radius.full, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  text: { fontFamily: fonts.semibold },
});
