import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function icon(children: React.ReactNode, props: IconProps) {
  const { size = 24, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return icon(
    <>
      <circle cx={11} cy={11} r={8} />
      <path d="m21 21-4.35-4.35" />
    </>,
    props,
  );
}

export function MapPinIcon(props: IconProps) {
  return icon(
    <>
      <path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0Z" />
      <circle cx={12} cy={10} r={3} />
    </>,
    props,
  );
}

export function StethoscopeIcon(props: IconProps) {
  return icon(
    <>
      <path d="M4 8V2" />
      <path d="M10 8V2" />
      <path d="M19 10.5V17a4 4 0 0 1-8 0v-4" />
      <path d="M7 2v6a5 5 0 0 0 10 0V2" />
      <circle cx={12} cy={7} r={1} />
      <path d="M19 10.5a2.5 2.5 0 0 1 5 0v.5a3.5 3.5 0 0 1-7 0" />
    </>,
    props,
  );
}

export function GraduationCapIcon(props: IconProps) {
  return icon(
    <>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.1 2.2 2 6 2s6-.9 6-2v-5" />
    </>,
    props,
  );
}

export function StarIcon(props: IconProps) {
  return icon(
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
    props,
  );
}

export function CalendarIcon(props: IconProps) {
  return icon(
    <>
      <rect width={18} height={18} x={3} y={4} rx={2} ry={2} />
      <line x1={16} x2={16} y1={2} y2={6} />
      <line x1={8} x2={8} y1={2} y2={6} />
      <line x1={3} x2={21} y1={10} y2={10} />
    </>,
    props,
  );
}

export function ArrowRightIcon(props: IconProps) {
  return icon(
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>,
    props,
  );
}

export function UserIcon(props: IconProps) {
  return icon(
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx={12} cy={7} r={4} />
    </>,
    props,
  );
}

export function LogInIcon(props: IconProps) {
  return icon(
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1={15} x2={3} y1={12} y2={12} />
    </>,
    props,
  );
}

export function ChevronDownIcon(props: IconProps) {
  return icon(<path d="m6 9 6 6 6-6" />, props);
}

export function FilterIcon(props: IconProps) {
  return icon(
    <>
      <line x1={4} x2={20} y1={6} y2={6} />
      <line x1={8} x2={16} y1={12} y2={12} />
      <line x1={12} x2={12} y1={18} y2={18} />
    </>,
    props,
  );
}

export function ClockIcon(props: IconProps) {
  return icon(
    <>
      <circle cx={12} cy={12} r={10} />
      <polyline points="12 6 12 12 16 14" />
    </>,
    props,
  );
}

export function CheckCircleIcon(props: IconProps) {
  return icon(
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </>,
    props,
  );
}

export function AlertIcon(props: IconProps) {
  return icon(
    <>
      <path d="M12 9v4" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1={12} x2={12.01} y1={17} y2={17} />
    </>,
    props,
  );
}
