import { useState, useRef } from "react";
import PageLayout from "@/components/layout/PageLayout";
import GlassInput from "@/components/ui/GlassInput";
import OutputTypeSelector from "@/components/ui/OutputTypeSelector";
import GenerateButton from "@/components/ui/GenerateButton";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AnimateIn from "@/components/animation/AnimateIn";
import type { OutputType } from "@/lib/types";

export default function WriteMode() {
  const [text, setText] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("instrumental");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <PageLayout>
      {/* Title */}
      <AnimateIn delay={100} className="text-center mb-10">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-3">
          Write Mode
        </h1>
        <p className="text-white/50 text-lg font-light tracking-wide italic">
          Compose with words and imagery
        </p>
      </AnimateIn>

      {/* Form */}
      <AnimateIn delay={200} className="w-full max-w-2xl space-y-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* Image upload / preview */}
        {imagePreview ? (
          <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10">
            <img
              src={imagePreview}
              alt="Uploaded preview"
              className="w-full h-full object-cover"
            />
            <button
              onClick={removeImage}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-red-500/60 transition-colors cursor-pointer"
            >
              <MaterialIcon icon="close" size={18} className="text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 glass-button rounded-xl flex flex-col items-center justify-center gap-2 group hover:bg-white/5 transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <MaterialIcon
              icon="add_a_photo"
              size={36}
              className="text-white/40 group-hover:text-primary transition-colors"
            />
            <span className="text-sm font-medium text-white/60 uppercase tracking-widest">
              Upload Image / Open Camera
            </span>
          </button>
        )}

        {/* Text area */}
        <GlassInput
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Describe your moment..."
          className="h-48 text-lg font-light rounded-xl p-6"
          rows={8}
        />

      </AnimateIn>

      {/* Output type */}
      <AnimateIn delay={300} className="mt-6">
        <OutputTypeSelector value={outputType} onChange={setOutputType} />
      </AnimateIn>

      {/* Generate */}
      <AnimateIn delay={300}>
        <GenerateButton
          className="mt-4"
          disabled={text.length === 0 && !imagePreview}
        />
      </AnimateIn>
    </PageLayout>
  );
}
