import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
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

import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts } from '@/constants/theme';

const easing = Easing.bezier(0.2, 0, 0, 1);
const PADDING = 3;

type Option<T extends string> = { label: string; value: T };

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Themed segmented control: squircle track with a sliding squircle thumb.
 * Thumb radius is concentric with the track (12 − 3 padding = 9).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const { theme } = useAppTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const position = useSharedValue(index);

  useEffect(() => {
    position.value = withTiming(index, { duration: 220, easing });
  }, [index, position]);

  const thumbWidth =
    trackWidth > PADDING * 2 ? (trackWidth - PADDING * 2) / options.length : 0;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: PADDING + position.value * thumbWidth }],
  }));

  const thumbColor = theme.dark
    ? 'rgba(255, 255, 255, 0.1)'
    : theme.background;

  return (
    <SquircleView
      style={[styles.track, style]}
      backgroundColor={theme.card}
      cornerRadius={12}
      cornerSmoothing={1}>
      <View
        style={styles.inner}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}>
        {thumbWidth > 0 && (
          <Animated.View
            style={[styles.thumb, { width: thumbWidth }, thumbStyle]}
            pointerEvents="none">
            <SquircleView
              style={styles.fill}
              backgroundColor={thumbColor}
              cornerRadius={9}
              cornerSmoothing={1}
            />
          </Animated.View>
        )}
        <View style={styles.labels}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              style={styles.segment}
              onPress={() => onChange(option.value)}>
              <Text
                style={[
                  styles.label,
                  {
                    color:
                      option.value === value
                        ? theme.textPrimary
                        : theme.textSecondary,
                  },
                ]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SquircleView>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 40,
    alignSelf: 'stretch',
  },
  inner: {
    flex: 1,
  },
  thumb: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
  },
  labels: {
    flex: 1,
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 14,
  },
  fill: {
    flex: 1,
  },
});
