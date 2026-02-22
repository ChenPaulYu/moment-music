import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import GlassPanel from "@/components/ui/GlassPanel";
import OutputTypeSelector from "@/components/ui/OutputTypeSelector";
import GenerateButton from "@/components/ui/GenerateButton";
import GenerationSteps from "@/components/ui/GenerationSteps";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AnimateIn from "@/components/animation/AnimateIn";
import { cn } from "@/lib/utils";
import { generateBe, getApiKeyStatus, getJobStatus, cancelJob } from "@/lib/api";
import { saveActiveJob, getActiveJob, clearActiveJob } from "@/lib/jobs";
import { getEngineForOutput, getAlbumArtEnabled } from "@/lib/engine";
import { getAllStylePromptsForMode } from "@/lib/stylePrompts";
import ApiKeyDialog from "@/components/ui/ApiKeyDialog";
import type { OutputType, EnvironmentData } from "@/lib/types";

function getTimePeriod(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime Fog",
  51: "Light Drizzle", 53: "Drizzle", 55: "Dense Drizzle",
  61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
  71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 77: "Snow Grains",
  80: "Light Showers", 81: "Showers", 82: "Heavy Showers",
  85: "Light Snow Showers", 86: "Snow Showers",
  95: "Thunderstorm", 96: "Thunderstorm w/ Hail", 99: "Severe Thunderstorm",
};

async function fetchWeather(lat: number, lon: number): Promise<{ description: string; temp: number }> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
  );
  const data = await res.json();
  const code: number = data.current?.weather_code ?? -1;
  const temp: number = Math.round(data.current?.temperature_2m ?? 0);
  const description = WMO_DESCRIPTIONS[code] ?? "Unknown";
  return { description, temp };
}

export default function BeMode() {
  const navigate = useNavigate();
  const [outputType, setOutputType] = useState<OutputType>("instrumental");
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [steps, setSteps] = useState<string[]>([]);
  const [queuePosition, setQueuePosition] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const [error, setError] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);

  const [feeling, setFeeling] = useState("");
  const FEELING_MAX_WORDS = 30;

  const [envData, setEnvData] = useState<EnvironmentData>({
    location: "—",
    weather: "—",
    time: "—",
  });

  const handleFetchEnvironment = () => {
    if (fetching || fetched) return;
    setFetching(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const [geoRes, weather] = await Promise.all([
            fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { "User-Agent": "MomentMusic/1.0" } }
            ).then((r) => r.json()),
            fetchWeather(latitude, longitude),
          ]);
          const city =
            geoRes.address?.city ||
            geoRes.address?.town ||
            geoRes.address?.state ||
            "Unknown";
          const timePeriod = getTimePeriod();

          setLocationName(city);
          setEnvData({
            location: city,
            weather: `${weather.description}, ${weather.temp}°C`,
            time: timePeriod,
          });
          setFetched(true);
        } catch {
          setError("Failed to detect location. Please try again.");
        } finally {
          setFetching(false);
        }
      },
      () => {
        setError("Location permission denied. Please allow access and retry.");
        setFetching(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const pollingRef = useRef(false);
  const startPolling = useCallback((jid: string) => {
    pollRef.current = setInterval(async () => {
      if (pollingRef.current) return; // skip if previous poll still in-flight
      pollingRef.current = true;
      try {
        const job = await getJobStatus(jid);
        setSteps((prev) =>
          prev.length === job.steps.length && prev.every((s, i) => s === job.steps[i])
            ? prev
            : job.steps
        );
        setCurrentStep((prev) => (prev === job.step ? prev : job.step));
        setQueuePosition((prev) => (prev === job.queue_position ? prev : job.queue_position));

        if (job.status === "completed") {
          clearInterval(pollRef.current);
          clearActiveJob();
          setCurrentStep(job.steps.length);
          await new Promise((r) => setTimeout(r, 500));
          navigate(`/player/${jid}`, { state: job.result });
        } else if (job.status === "failed") {
          clearInterval(pollRef.current);
          clearActiveJob();
          setError(job.error || "Generation failed");
          setGenerating(false);
          setJobId(null);
        } else if (job.status === "cancelled") {
          clearInterval(pollRef.current);
          clearActiveJob();
          setGenerating(false);
          setJobId(null);
        }
      } catch {
        clearInterval(pollRef.current);
        clearActiveJob();
        setGenerating(false);
        setJobId(null);
        setError("Generation session lost. Please try again.");
      } finally {
        pollingRef.current = false;
      }
    }, 2000);
  }, [navigate]);

  // Resume job on mount
  useEffect(() => {
    const active = getActiveJob();
    if (active && active.mode === "be") {
      setJobId(active.jobId);
      setGenerating(true);
      startPolling(active.jobId);
    }
    return () => clearInterval(pollRef.current);
  }, [startPolling]);

  const handleGenerate = async () => {
    if (!fetched || generating) return;

    // Check API keys
    try {
      const status = await getApiKeyStatus();
      const missing: string[] = [];
      if (!status.openai) missing.push("openai");
      const engine = getEngineForOutput(outputType);
      if (engine.includes("stable_audio_api") && !status.stability)
        missing.push("stability");
      if (missing.length > 0) {
        setMissingKeys(missing);
        setShowKeyDialog(true);
        return;
      }
    } catch {
      // continue anyway if status check fails
    }

    setGenerating(true);
    setCurrentStep(0);
    setError(null);

    try {
      const { job_id } = await generateBe({
        location: locationName,
        feeling: feeling.trim() || undefined,
        outputType,
        engine: getEngineForOutput(outputType),
        generate_image: getAlbumArtEnabled(),
        style_prompts: getAllStylePromptsForMode("be"),
      });
      setJobId(job_id);
      saveActiveJob(job_id, "be");
      startPolling(job_id);
    } catch (err) {
      setCurrentStep(-1);
      setError(
        err instanceof Error ? err.message : "Generation failed. Try again."
      );
      setGenerating(false);
    }
  };

  const handleCancel = async () => {
    if (jobId) {
      await cancelJob(jobId);
      clearInterval(pollRef.current);
      clearActiveJob();
      setGenerating(false);
      setCurrentStep(-1);
      setJobId(null);
    }
  };

  return (
    <PageLayout>
      {/* Mode badge + title */}
      <AnimateIn delay={100}>
        <div className="flex justify-center mb-4">
          <div className="glass-panel px-4 py-1.5 rounded-full">
            <span className="text-primary text-xs font-bold tracking-widest uppercase">
              Be Mode
            </span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-white mb-2 text-center">
          Tune into your
        </h1>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-center text-gradient mb-10 sm:mb-12">
          surroundings
        </h1>
      </AnimateIn>

      {/* Fetch environment circle */}
      <AnimateIn delay={200} className="flex justify-center">
        <button
          onClick={handleFetchEnvironment}
          disabled={fetching || fetched}
          className={cn(
            "relative w-56 h-56 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full flex flex-col items-center justify-center gap-2 sm:gap-3",
            "bg-background-dark/60 border border-white/10 cursor-pointer",
            "hover:border-primary/30 transition-all duration-500",
            "disabled:cursor-not-allowed",
            "mb-8 sm:mb-12",
            fetched && "border-primary/30 shadow-[0_0_40px_rgba(99,71,255,0.2)]"
          )}
        >
          {fetching ? (
            <MaterialIcon
              icon="progress_activity"
              size={40}
              className="text-primary animate-spin"
            />
          ) : (
            <MaterialIcon
              icon="share_location"
              size={40}
              className={cn(
                "transition-colors",
                fetched ? "text-primary" : "text-white/60"
              )}
            />
          )}
          <span className="text-white font-medium text-lg">
            {fetching
              ? "Detecting..."
              : fetched
                ? "Environment Detected"
                : "Fetch Environment"}
          </span>
          {!fetching && !fetched && (
            <span className="text-white/40 text-sm">Click to analyze</span>
          )}
        </button>
      </AnimateIn>

      {/* Environment data cards */}
      <AnimateIn delay={300}>
        <GlassPanel className="w-full max-w-2xl p-4 sm:p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                icon: "navigation",
                label: "LOCATION",
                value: envData.location,
                color: "text-blue-400",
              },
              {
                icon: "cloud",
                label: "WEATHER",
                value: envData.weather,
                color: "text-white/60",
              },
              {
                icon: "wb_twilight",
                label: "TIME",
                value: envData.time,
                color: "text-amber-400",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="glass-panel rounded-lg px-4 py-5 sm:p-4 flex flex-col items-center text-center gap-2"
              >
                <MaterialIcon
                  icon={card.icon}
                  size={28}
                  className={card.color}
                />
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">
                  {card.label}
                </span>
                <span className="text-white font-semibold text-sm">
                  {card.value}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </AnimateIn>

      {/* Feeling textarea */}
      {fetched && (
        <AnimateIn delay={350}>
          <div className="w-full max-w-2xl mb-8 px-1 sm:px-0">
            <label className="block text-[10px] font-bold tracking-widest uppercase text-white/40 mb-2">
              How are you feeling? <span className="normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <textarea
              value={feeling}
              onChange={(e) => {
                const words = e.target.value.split(/\s+/).filter(Boolean);
                if (words.length <= FEELING_MAX_WORDS) {
                  setFeeling(e.target.value);
                }
              }}
              disabled={generating}
              placeholder="Calm and peaceful, watching the sunset fade..."
              rows={3}
              className="glass-input w-full rounded-xl px-5 py-3.5 text-sm resize-none"
            />
            <div className="flex justify-end mt-1">
              <span
                className={cn(
                  "text-xs",
                  feeling.split(/\s+/).filter(Boolean).length >= FEELING_MAX_WORDS
                    ? "text-red-400"
                    : "text-white/30"
                )}
              >
                {feeling.split(/\s+/).filter(Boolean).length}/{FEELING_MAX_WORDS} words
              </span>
            </div>
          </div>
        </AnimateIn>
      )}

      {/* Output type + Generate */}
      <AnimateIn delay={400}>
        <OutputTypeSelector
          value={outputType}
          onChange={setOutputType}
          disabled={generating}
        />
        <GenerateButton
          className="mt-6"
          onClick={handleGenerate}
          disabled={!fetched || generating}
          loading={generating}
          label={generating ? "Generating..." : "Generate Soundscape"}
          icon={generating ? "progress_activity" : "auto_awesome"}
        />
        {generating && (
          <>
            {queuePosition > 0 && (
              <p className="text-white/50 text-sm mt-4 text-center">
                Waiting in queue (position #{queuePosition})...
              </p>
            )}
            {queuePosition === 0 && steps.length > 0 && (
              <GenerationSteps steps={steps} currentStep={currentStep} />
            )}
            <div className="flex justify-center">
              <button
                onClick={handleCancel}
                className="mt-3 text-sm text-white/40 hover:text-red-400 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        )}
        {error && (
          <p className="mt-4 text-red-400 text-sm text-center max-w-md">
            {error}
          </p>
        )}
      </AnimateIn>

      {showKeyDialog && (
        <ApiKeyDialog
          missingKeys={missingKeys}
          onClose={() => setShowKeyDialog(false)}
          onSaved={() => {
            setShowKeyDialog(false);
            handleGenerate();
          }}
        />
      )}
    </PageLayout>
  );
}
