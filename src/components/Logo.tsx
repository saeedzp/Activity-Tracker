/** The app mark: a display stand with its header panel and tilted, stocked shelves. */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Activity Tracker"
      className="flex-none"
    >
      <rect width="512" height="512" rx="116" fill="#17150F" />
      <rect x="126" y="80" width="260" height="66" rx="18" fill="#E4002B" />
      <g transform="rotate(-8 256 250)">
        <rect x="132" y="196" width="72" height="56" rx="13" fill="#F5B301" />
        <rect x="216" y="182" width="72" height="70" rx="13" fill="#00A868" />
        <rect x="300" y="202" width="72" height="50" rx="13" fill="#0A7CC4" />
        <rect x="120" y="256" width="264" height="22" rx="11" fill="#FFFFFF" />
      </g>
      <g transform="rotate(-8 256 360)">
        <rect x="132" y="306" width="72" height="56" rx="13" fill="#7B2E8E" />
        <rect x="216" y="292" width="72" height="70" rx="13" fill="#FF2E88" />
        <rect x="300" y="312" width="72" height="50" rx="13" fill="#F5B301" />
        <rect x="120" y="366" width="264" height="22" rx="11" fill="#FFFFFF" />
      </g>
      <rect x="152" y="416" width="208" height="26" rx="12" fill="#FFFFFF" opacity=".75" />
    </svg>
  );
}
