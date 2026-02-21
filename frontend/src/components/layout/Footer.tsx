import { APP_VERSION } from "@/lib/constants";

interface FooterProps {
  statusMessage?: string;
  screenName?: string;
}

export default function Footer({
  statusMessage = `Powered by MomentMusic Generative Audio Engine ${APP_VERSION}`,
}: FooterProps) {
  return (
    <footer className="w-full px-8 py-6 flex items-center justify-center z-20 text-white/20 text-xs tracking-wider">
      {statusMessage}
    </footer>
  );
}
