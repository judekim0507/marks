import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { getSquirclePath } from '@/components/squircle-path';

export type CornerRadii = {
  topLeft?: number;
  topRight?: number;
  bottomRight?: number;
  bottomLeft?: number;
};

type SquircleViewProps = {
  /** Figma corner smoothing, 0–1. iOS `borderCurve: 'continuous'` is fixed at ~0.6, so exact values need a real path. */
  cornerSmoothing: number;
  cornerRadius?: number;
  /** Per-corner radii; overrides `cornerRadius` for the corners given. */
  cornerRadii?: CornerRadii;
  backgroundColor: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * A View whose background is a Figma-accurate squircle, drawn with the same
 * corner-smoothing math Figma uses (see squircle-path.ts).
 */
export function SquircleView({
  cornerSmoothing,
  cornerRadius,
  cornerRadii,
  backgroundColor,
  style,
  children,
}: SquircleViewProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  return (
    <View style={style} onLayout={onLayout}>
      {size.width > 0 && size.height > 0 && (
        <Svg
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}
          pointerEvents="none">
          <Path
            d={getSquirclePath({
              width: size.width,
              height: size.height,
              cornerRadius,
              cornerSmoothing,
              topLeftCornerRadius: cornerRadii?.topLeft,
              topRightCornerRadius: cornerRadii?.topRight,
              bottomRightCornerRadius: cornerRadii?.bottomRight,
              bottomLeftCornerRadius: cornerRadii?.bottomLeft,
            })}
            fill={backgroundColor}
          />
        </Svg>
      )}
      {children}
    </View>
  );
}
