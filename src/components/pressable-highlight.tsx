import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { SquircleView, type CornerRadii } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';

const easing = Easing.bezier(0.2, 0, 0, 1);

type PressableHighlightProps = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  highlightColor?: string;
  /** Scale while pressed. Wide surfaces want less than a button's 0.96. */
  pressedScale?: number;
  cornerRadius?: number;
  cornerRadii?: CornerRadii;
  cornerSmoothing?: number;
  children: ReactNode;
};

/**
 * Pressable list row with an iOS-style pressed highlight plus a gentle scale.
 * The highlight is drawn as a squircle so rows at the top or bottom of a
 * smoothed-corner card can match the card's corners exactly.
 */
export function PressableHighlight({
  onPress,
  style,
  contentStyle,
  highlightColor,
  pressedScale = 0.985,
  cornerRadius = 0,
  cornerRadii,
  cornerSmoothing = 0,
  children,
}: PressableHighlightProps) {
  const { theme } = useAppTheme();
  const overlayColor = highlightColor ?? theme.highlight;
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - pressedScale) }],
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: pressed.value,
  }));

  return (
    <Pressable
      style={style}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 100, easing });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 180, easing });
      }}>
      <Animated.View style={[styles.fill, animatedStyle]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, highlightStyle]}
          pointerEvents="none">
          <SquircleView
            style={styles.fill}
            backgroundColor={overlayColor}
            cornerRadius={cornerRadius}
            cornerRadii={cornerRadii}
            cornerSmoothing={cornerSmoothing}
          />
        </Animated.View>
        <View style={contentStyle}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
