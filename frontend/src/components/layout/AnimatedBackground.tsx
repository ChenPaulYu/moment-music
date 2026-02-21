export default function AnimatedBackground() {
  return (
    <>
      <div className="fixed inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-700 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-800 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-4000" />
        <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent" />
      </div>
      <div className="noise-overlay" />
    </>
  );
}
