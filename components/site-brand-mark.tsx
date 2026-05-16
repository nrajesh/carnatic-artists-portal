import type { SVGProps } from "react";

export function SiteBrandMark({ className = "h-6 w-6", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="3 3 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8.1 5.6A7.7 7.7 0 0 1 15.9 5.6"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
      />
      <path
        d="M18.4 8.1A7.7 7.7 0 0 1 18.4 15.9"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
      />
      <path
        d="M15.9 18.4A7.7 7.7 0 0 1 8.1 18.4"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
      />
      <path
        d="M5.6 15.9A7.7 7.7 0 0 1 5.6 8.1"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
      />
      <path
        d="M12 5.9 14.08 10 18.1 12l-4.02 2L12 18.1 9.92 14 5.9 12l4.02-2L12 5.9Z"
        fill="currentColor"
      />
      <path d="M12 9.8 14.2 12 12 14.2 9.8 12 12 9.8Z" fill="#FDBA74" fillOpacity=".92" />
    </svg>
  );
}
