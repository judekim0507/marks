import Svg, { Path } from 'react-native-svg';

type IconProps = {
  color: string;
  width: number;
  height: number;
};

/** Row chevron, exact vector from the Figma design. */
export function ChevronRightIcon({ color, width, height }: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 6.58563 12" fill="none">
      <Path
        d="M1 1L5.28177 5.15202C5.67838 5.53662 5.68798 6.16996 5.30321 6.5664L1 11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Cross-platform quick-action glyphs (expo-symbols is iOS-only). */
export function DocIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 3h7l4 4v14H7V3Z M14 3v4h4 M10 12h5 M10 16h5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ScheduleIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5h16v14H4V5Z M4 10h16 M10 10v9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3.5 2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PersonIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
