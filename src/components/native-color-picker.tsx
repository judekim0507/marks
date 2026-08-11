import { Pressable, StyleSheet, View } from 'react-native';

type NativeColorPickerProps = {
  color: string;
  onChange: (color: string) => void;
};

/** Non-iOS fallback: a swatch that cycles through a small preset palette. */
const PALETTE = ['#38bdf8', '#a78bfa', '#fb7185', '#fbbf24', '#34d399'];

export function NativeColorPicker({ color, onChange }: NativeColorPickerProps) {
  return (
    <Pressable
      onPress={() => {
        const next = (PALETTE.indexOf(color) + 1) % PALETTE.length;
        onChange(PALETTE[next]);
      }}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(127, 127, 127, 0.4)',
  },
});
