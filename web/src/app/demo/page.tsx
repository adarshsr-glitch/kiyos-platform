import { RecordingReset } from "@/prototype/recording-reset";

export const metadata = { title: "Kiyos · Reset demo" };

/** Bookmark for the presenter: localhost:3000/demo → Reset demo. */
export default function DemoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef0ec] px-4">
      <RecordingReset className="w-full max-w-xl" />
    </div>
  );
}
