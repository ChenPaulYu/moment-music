import AnimatedBackground from "./AnimatedBackground";
import Header from "./Header";
import Footer from "./Footer";
import PageTransition from "@/components/animation/PageTransition";

interface PageLayoutProps {
  children: React.ReactNode;
  footerProps?: {
    statusMessage?: string;
    screenName?: string;
  };
  showFooter?: boolean;
}

export default function PageLayout({
  children,
  footerProps,
  showFooter = true,
}: PageLayoutProps) {
  return (
    <div className="relative flex flex-col min-h-screen">
      <AnimatedBackground />
      <Header />
      <main className="flex-grow flex flex-col items-center relative z-10 w-full px-4 sm:px-6 lg:px-16 pt-24 sm:pt-28 pb-10">
        <PageTransition className="flex flex-col items-center w-full">
          {children}
        </PageTransition>
      </main>
      {showFooter && <Footer {...footerProps} />}
    </div>
  );
}
