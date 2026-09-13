import { useMemo, useState, type ReactNode } from 'react';
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

  const { topLeft, topRight, bottomRight, bottomLeft } = cornerRadii ?? {};

  // Memoize the heavy squircle math so onLayout churn (which keeps `size` as a
  // new object only when it actually changes) never rebuilds the path string.
  const path = useMemo(
    () =>
      getSquirclePath({
        width: size.width,
        height: size.height,
        cornerRadius,
        cornerSmoothing,
        topLeftCornerRadius: topLeft,
        topRightCornerRadius: topRight,
        bottomRightCornerRadius: bottomRight,
        bottomLeftCornerRadius: bottomLeft,
      }),
    [size.width, size.height, cornerRadius, cornerSmoothing, topLeft, topRight, bottomRight, bottomLeft],
  );

  // Solid fallback behind the SVG so the card never pops from transparent
  // during the first (size-0) frame before onLayout reports dimensions.
  const radiusStyle = {
    borderRadius: cornerRadius,
    borderTopLeftRadius: topLeft,
    borderTopRightRadius: topRight,
    borderBottomRightRadius: bottomRight,
    borderBottomLeftRadius: bottomLeft,
  };

  const hasSize = size.width > 0 && size.height > 0;

  return (
    <View style={[style, radiusStyle, { backgroundColor }]} onLayout={onLayout}>
      {hasSize && (
        <Svg
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}
          pointerEvents="none">
          <Path d={path} fill={backgroundColor} />
        </Svg>
      )}
      {children}
    </View>
  );
}
