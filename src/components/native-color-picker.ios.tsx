import { Host } from '@expo/ui';
import { ColorPicker } from '@expo/ui/swift-ui';
import { StyleSheet, View } from 'react-native';

type NativeColorPickerProps = {
  color: string;
  onChange: (color: string) => void;
};

/**
 * SwiftUI color picker — a tappable swatch that opens the system color sheet.
 * The 28pt control sits centered in a 26pt layout box so it occupies the same
 * footprint as the preset theme swatches and row labels stay aligned.
 */
export function NativeColorPicker({ color, onChange }: NativeColorPickerProps) {
  return (
    <View style={styles.box}>
      <Host style={styles.host}>
        <ColorPicker
          selection={color}
          onSelectionChange={onChange}
          supportsOpacity={false}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  host: {
    width: 28,
    height: 28,
  },
});
