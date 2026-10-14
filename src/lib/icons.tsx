/**
 * Icon set ported verbatim from the reference app.js (Lucide-style stroke icons).
 * The path data is kept exactly as in the reference and parsed into
 * react-native-svg elements by the tiny parser below.
 */

import { useMemo, type ComponentType } from 'react';
import Svg, { Circle, Ellipse, Path, Rect, type SvgProps } from 'react-native-svg';

export const ICONS: Record<string, string> = {
  utensils: '<path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2"/><path d="M6 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v8a2 2 0 0 0 2 2h3z"/><path d="M21 15v7"/>',
  basket: '<path d="M5.5 6l1.2-2.9a1 1 0 0 1 .93-.6h8.74a1 1 0 0 1 .93.6L18.5 6"/><path d="M2.5 12h19l-1.8 7.6a2 2 0 0 1-2 1.6H6.3a2 2 0 0 1-2-1.6L2.5 12z"/><path d="M9 15.5h.01"/><path d="M15 15.5h.01"/><path d="M8.2 9.5l-.7 2.5"/><path d="M15.8 9.5l.7 2.5"/>',
  coffee: '<path d="M17 9h1.5a3.5 3.5 0 0 1 0 7H17"/><path d="M3 9h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9z"/><path d="M7 2.5v2"/><path d="M11 2.5v2"/><path d="M15 2.5v2"/>',
  bus: '<rect x="4" y="3.5" width="16" height="14" rx="2.5"/><path d="M4 9.5h16"/><path d="M2.5 17.5h1.5"/><path d="M20 17.5h1.5"/><circle cx="7.5" cy="17.5" r="2.2"/><circle cx="16.5" cy="17.5" r="2.2"/><path d="M9 9.5v4"/><path d="M15 9.5v4"/>',
  car: '<path d="M4 16.5L5.6 11a2 2 0 0 1 1.9-1.4h9a2 2 0 0 1 1.9 1.4L19 16.5"/><path d="M2.5 16.5h2"/><path d="M19.5 16.5h2"/><circle cx="7" cy="16.5" r="2.2"/><circle cx="17" cy="16.5" r="2.2"/><path d="M9.2 16.5h5.6"/><path d="M7.7 12.2h8.6"/>',
  fuel: '<path d="M3 22h12"/><path d="M5 9h8"/><path d="M13 22V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v18"/><path d="M13 13h1.5a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.8a2 2 0 0 0-.6-1.4L17 5.5"/>',
  house: '<path d="M3.5 10.5L12 3l8.5 7.5"/><path d="M5.5 9v12h13V9"/><path d="M10 21v-6h4v6"/>',
  bulb: '<path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.6.4.8 1.1.8 1.7h6c0-.6.2-1.3.8-1.7A6.5 6.5 0 0 0 12 2.5z"/><path d="M9.5 19.5h5"/><path d="M10.5 22h3"/>',
  wifi: '<path d="M2.5 9.5a14 14 0 0 1 19 0"/><path d="M5.5 12.7a9.5 9.5 0 0 1 13 0"/><path d="M8.5 15.9a5 5 0 0 1 7 0"/><path d="M12 19h.01"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>',
  droplet: '<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>',
  heart: '<path d="M12 20.3C7.4 16.7 3.5 13.6 3.5 9.9 3.5 7.3 5.4 5.5 7.8 5.5c1.5 0 3 .8 4.2 2.4 1.2-1.6 2.7-2.4 4.2-2.4 2.4 0 4.3 1.8 4.3 4.4 0 3.7-3.9 6.8-8.5 10.4z"/><path d="M4.5 12.5h3l1.5-2.5 2.5 5 1.5-2.5h4.5"/>',
  pill: '<path d="M10.5 20.5a5 5 0 0 1-7-7l9-9a5 5 0 0 1 7 7l-9 9z"/><path d="M8.5 8.5l7 7"/>',
  dumbbell: '<path d="M2.5 12h2"/><path d="M19.5 12h2"/><rect x="4.5" y="8" width="3" height="8" rx="1"/><rect x="16.5" y="8" width="3" height="8" rx="1"/><path d="M7.5 12h9"/>',
  bag: '<path d="M5.5 8h13l-1 12a2 2 0 0 1-2 1.8H8.5a2 2 0 0 1-2-1.8L5.5 8z"/><path d="M9 10.5V6a3 3 0 0 1 6 0v4.5"/>',
  grad: '<path d="M12 4L2.5 8.7a.9.9 0 0 0 0 1.6l9.5 4.7a1.6 1.6 0 0 0 1.4 0l9.1-4.5a.9.9 0 0 0 0-1.6L12 4z"/><path d="M6.5 11.7V16c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.3"/><path d="M21.7 10.6V16"/>',
  gift: '<path d="M20 12v9.5H4V12"/><path d="M2.5 7h19v5h-19z"/><path d="M12 21.5V7"/><path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>',
  piggy: '<ellipse cx="11.5" cy="13" rx="7.5" ry="5.5"/><circle cx="19.6" cy="13" r="1.7"/><path d="M6.8 8.3L5.2 5.5l3.9 1.7"/><path d="M7 18.3V21"/><path d="M14 18.3V21"/><path d="M13.8 11.3h.01"/><path d="M10 7.5h3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7.5l8.5 5.5 8.5-5.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><path d="M12 14.5v2"/>',
  eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M4 4l16 16"/><path d="M6.7 6.7C4.2 8.5 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.8 0 3.4-.6 4.7-1.4"/><path d="M21.5 12s-1.4-2.5-3.9-4.2"/><path d="M10.5 10.6a3 3 0 0 0 4 4.1"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 10h17"/><path d="M8.5 3v4"/><path d="M15.5 3v4"/>',
  pencil: '<path d="M17.1 3.6a2.1 2.1 0 0 1 3 3L8 18.7l-4.2 1 1-4.2L17.1 3.6z"/>',
  trash: '<path d="M4 6.5h16"/><path d="M9 6.5V4.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4.5v2"/><path d="M6 6.5l.8 13a2 2 0 0 0 2 1.9h6.4a2 2 0 0 0 2-1.9l.8-13"/><path d="M10 10.5v7"/><path d="M14 10.5v7"/>',
  plus: '<path d="M12 5.5v13"/><path d="M5.5 12h13"/>',
  wallet: '<path d="M21 12.5V7H5.5a2 2 0 0 1 0-4H19v4"/><path d="M3 5v13.5a2 2 0 0 0 2 2h15.5a.5.5 0 0 0 .5-.5V16"/><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2.5"/>',
  alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9.5V13l2.5 2"/><path d="M5 3.5L2.5 6"/><path d="M19 3.5L21.5 6"/>',
  chevL: '<path d="M14.5 6L8.5 12l6 6"/>',
  chevR: '<path d="M9.5 6l6 6-6 6"/>',
  chevD: '<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>',
  receipt: '<path d="M5 21V4a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 19 4v17l-2.3-1.5L14.3 21 12 19.5 9.7 21 7.3 19.5 5 21z"/><path d="M9 7.5h6"/><path d="M9 11h6"/>',
  tag: '<path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5a1.5 1.5 0 0 1 0 2.1l-7 7a1.5 1.5 0 0 1-2.1 0L3.5 12z"/><path d="M8 8h.01"/>',
  calplus: '<rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 10h17"/><path d="M8.5 3v4"/><path d="M15.5 3v4"/><path d="M12 12.5v5"/><path d="M9.5 15h5"/>',
};

export const CAT_ICONS = [
  'utensils', 'basket', 'coffee', 'bus', 'car', 'fuel', 'house', 'bulb', 'wifi',
  'phone', 'droplet', 'heart', 'pill', 'dumbbell', 'bag', 'grad', 'gift', 'piggy',
] as const;

const ELEMENTS: Record<string, ComponentType<any>> = {
  path: Path,
  rect: Rect,
  circle: Circle,
  ellipse: Ellipse,
};
const NUMERIC_ATTRS = new Set(['x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r']);
const TAG_RE = /<(\w+)\s+([^>]*?)\/>/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;

const parsedCache = new Map<string, React.ReactNode[]>();

function parseIconBody(body: string): React.ReactNode[] {
  const cached = parsedCache.get(body);
  if (cached) return cached;
  const out: React.ReactNode[] = [];
  let tagMatch: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((tagMatch = TAG_RE.exec(body))) {
    const Comp = ELEMENTS[tagMatch[1]];
    if (!Comp) continue;
    const props: Record<string, string | number> = {};
    let attrMatch: RegExpExecArray | null;
    ATTR_RE.lastIndex = 0;
    while ((attrMatch = ATTR_RE.exec(tagMatch[2]))) {
      const key = attrMatch[1];
      const value = attrMatch[2];
      props[key] = NUMERIC_ATTRS.has(key) ? parseFloat(value) : value;
    }
    out.push(<Comp key={out.length} {...props} />);
  }
  parsedCache.set(body, out);
  return out;
}

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: SvgProps['style'];
}

export function Icon({ name, size = 22, color = 'currentColor', strokeWidth = 1.8, style }: IconProps) {
  const body = ICONS[name] ?? '';
  const children = useMemo(() => parseIconBody(body), [body]);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}>
      {children}
    </Svg>
  );
}
