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
