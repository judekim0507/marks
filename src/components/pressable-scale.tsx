import { type ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const PRESSED_SCALE = 0.96;
const easing = Easing.bezier(0.2, 0, 0, 1);

type PressableScaleProps = {
  onPress?: () => void;
  /** Outer (unscaled) layout styles — size, flex, borders. */
  style?: StyleProp<ViewStyle>;
  /** Inner (scaled) content styles — padding, alignment. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Disables the press scale when motion would be distracting. */
  static?: boolean;
  children: ReactNode;
};

/**
 * Pressable with tactile scale-on-press feedback. Timing transitions retarget
 * mid-flight, so rapid press/release stays smooth and interruptible.
 */
export function PressableScale({
  onPress,
  style,
  contentStyle,
  static: isStatic = false,
  children,
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - PRESSED_SCALE) }],
  }));

  return (
    <Pressable
      style={style}
      onPress={onPress}
      onPressIn={() => {
        if (isStatic) return;
        pressed.value = withTiming(1, { duration: 100, easing });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 180, easing });
      }}>
      <Animated.View style={[{ flex: 1 }, contentStyle, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
