import type { SVGProps } from "react";

export function FeishuIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M3.6 4.2c0-.5.55-.8 1-.52l11.2 7.1a1.2 1.2 0 0 1 0 2.02l-5.7 3.62L3.6 11.9V4.2Z"
      />
      <path
        fill="#3370FF"
        d="M8.8 11.4 20.1 6.2c.5-.23 1.03.22.88.75l-3.1 11.1a1.5 1.5 0 0 1-2.16.92L8.8 15.1v-3.7Z"
      />
      <path
        fill="#1456F0"
        d="m8.8 15.1 3.7 2.05-2.6 2.95c-.44.5-1.26.19-1.26-.48V15.1h.16Z"
      />
    </svg>
  );
}
