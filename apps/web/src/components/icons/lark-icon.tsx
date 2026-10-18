import type { SVGProps } from "react";

export function LarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        fill="#00D6B9"
        d="M4.2 3.8c0-.5.55-.8 1-.52l11 7.05a1.2 1.2 0 0 1 0 2.02l-5.5 3.55L4.2 11.5V3.8Z"
      />
      <path
        fill="#3370FF"
        d="M9.2 11.1 20.2 6c.5-.23 1.03.22.88.75l-3.05 11a1.5 1.5 0 0 1-2.16.92L9.2 14.8v-3.7Z"
      />
      <path
        fill="#FFB800"
        d="m9.2 14.8 3.6 2-2.5 2.9c-.44.5-1.26.19-1.26-.48V14.8h.16Z"
      />
    </svg>
  );
}
