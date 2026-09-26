import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 22, children, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (<Base {...props}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></Base>);
}
export function PlanIcon(props: IconProps) {
  return (<Base {...props}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" stroke="none" /></Base>);
}
export function TripsIcon(props: IconProps) {
  return (<Base {...props}><rect x="3.5" y="7" width="17" height="13" rx="2.5" /><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" /><path d="M3.5 12.5h17" /></Base>);
}
export function SparkIcon(props: IconProps) {
  return (<Base {...props}><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" /><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></Base>);
}
export function ProfileIcon(props: IconProps) {
  return (<Base {...props}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20.5c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" /></Base>);
}
export function BellIcon(props: IconProps) {
  return (<Base {...props}><path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13.5 6 9.5" /><path d="M10 19.5a2.2 2.2 0 0 0 4 0" /></Base>);
}
export function BackIcon(props: IconProps) {
  return (<Base {...props}><path d="M15 5l-7 7 7 7" /></Base>);
}
export function CloseIcon(props: IconProps) {
  return (<Base {...props}><path d="M6 6l12 12M18 6 6 18" /></Base>);
}
export function CheckIcon(props: IconProps) {
  return (<Base {...props}><path d="m5 12.5 4.5 4.5L19 7.5" /></Base>);
}
export function PlusIcon(props: IconProps) {
  return (<Base {...props}><path d="M12 5v14M5 12h14" /></Base>);
}
export function MinusIcon(props: IconProps) {
  return (<Base {...props}><path d="M5 12h14" /></Base>);
}
export function CalendarIcon(props: IconProps) {
  return (<Base {...props}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></Base>);
}
export function UsersIcon(props: IconProps) {
  return (<Base {...props}><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19.5c.8-3 3-4.7 5.5-4.7s4.7 1.7 5.5 4.7" /><circle cx="16.5" cy="9.5" r="2.4" /><path d="M16 14.6c2 .3 3.6 1.7 4.3 4" /></Base>);
}
export function WalletIcon(props: IconProps) {
  return (<Base {...props}><rect x="3.5" y="6" width="17" height="13" rx="2.5" /><path d="M16 12.2h2.5" /></Base>);
}
export function MicIcon(props: IconProps) {
  return (<Base {...props}><rect x="9" y="3.5" width="6" height="10.5" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></Base>);
}
export function SearchIcon(props: IconProps) {
  return (<Base {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></Base>);
}

export function MapPinIcon(props: IconProps) {
  return (<Base {...props}><path d="M12 21.5S5.5 15.5 5.5 10.5a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10.5" r="2.3" /></Base>);
}
export function StayIcon(props: IconProps) {
  return (<Base {...props}><path d="M4 11V7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V11" /><path d="M3.5 11h17v8h-17z" /><path d="M3.5 14.5h17" /></Base>);
}
export function TransportIcon(props: IconProps) {
  return (<Base {...props}><rect x="4" y="4.5" width="16" height="11" rx="2.5" /><path d="M4 11.5h16" /><circle cx="8" cy="18.5" r="1.8" /><circle cx="16" cy="18.5" r="1.8" /></Base>);
}
export function ActivityIcon(props: IconProps) {
  return (<Base {...props}><path d="M7 4.5h10l-1 6.5h-8z" /><path d="M12 11v9M8.5 20h7" /></Base>);
}
export function FoodIcon(props: IconProps) {
  return (<Base {...props}><path d="M7 3.5v7a2 2 0 0 0 4 0v-7M9 3.5V2" /><path d="M7 12.5h4V21H7zM16.5 3.5c-1.8 1.5-2.5 4-2.5 6.5 0 2.5 1 3.5 2.5 3.5V21" /></Base>);
}
export function LeisureIcon(props: IconProps) {
  return (<Base {...props}><path d="M12 20.5c-4.5-2-7-5.2-7-9.5 0-2.5 1.8-4.5 4-4.5 1.5 0 2.5.8 3 2 .5-1.2 1.5-2 3-2 2.2 0 4 2 4 4.5 0 4.3-2.5 7.5-7 9.5z" /></Base>);
}
export function NoteIcon(props: IconProps) {
  return (<Base {...props}><path d="M6 3.5h8L19 8.5V20.5H6z" /><path d="M13.5 3.5V9H19" /><path d="M9 13h6M9 16h4" /></Base>);
}
export function PdfIcon(props: IconProps) {
  return (<Base {...props}><path d="M6 3.5h8L19 8.5V20.5H6z" /><path d="M13.5 3.5V9H19" /><path d="M9 16.5v-4h4v4M9 14.5h4" /></Base>);
}
export function EditIcon(props: IconProps) {
  return (<Base {...props}><path d="m14.5 5.5 4 4L8 20l-4.5.5L4 16z" /><path d="m13 7 4 4" /></Base>);
}
export function TrashIcon(props: IconProps) {
  return (<Base {...props}><path d="M4.5 6.5h15M9.5 6V4.5A1 1 0 0 1 10.5 3.5h3a1 1 0 0 1 1 1V6" /><path d="M6.5 6.5 7.5 20.5h9l1-14" /><path d="M10 10.5v6M14 10.5v6" /></Base>);
}
export function ChevronDownIcon(props: IconProps) {
  return (<Base {...props}><path d="m6 9.5 6 6 6-6" /></Base>);
}
export function ChevronRightIcon(props: IconProps) {
  return (<Base {...props}><path d="m9.5 6 6 6-6 6" /></Base>);
}
export function StarIcon(props: IconProps) {
  return (<Base {...props}><path d="m12 3.5 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.9l6.1-.8z" /></Base>);
}
export function GlobeIcon(props: IconProps) {
  return (<Base {...props}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c-4.5 4.5-4.5 12.5 0 17M12 3.5c4.5 4.5 4.5 12.5 0 17" /></Base>);
}
export function RotateIcon(props: IconProps) {
  return (<Base {...props}><path d="M4.5 9A8 8 0 0 1 19.5 12 8 8 0 0 1 5 15.5" /><path d="M4.5 4.5V9H9" /></Base>);
}
export function ZoomInIcon(props: IconProps) {
  return (<Base {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5M11 8.5v5M8.5 11h5" /></Base>);
}
export function ZoomOutIcon(props: IconProps) {
  return (<Base {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5M8.5 11h5" /></Base>);
}
export function PauseIcon(props: IconProps) {
  return (<Base {...props}><path d="M9.5 5.5v13M14.5 5.5v13" /></Base>);
}
export function PlayIcon(props: IconProps) {
  return (<Base {...props}><path d="M8 5.5v13l10-6.5z" /></Base>);
}
export function SendIcon(props: IconProps) {
  return (<Base {...props}><path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4z" /></Base>);
}
export function ShareIcon(props: IconProps) {
  return (<Base {...props}><circle cx="6.5" cy="12" r="2.5" /><circle cx="17" cy="5.5" r="2.5" /><circle cx="17" cy="18.5" r="2.5" /><path d="m8.7 10.8 6-4M8.7 13.2l6 4" /></Base>);
}

