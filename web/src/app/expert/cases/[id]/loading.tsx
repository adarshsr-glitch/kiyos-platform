import { Skeleton } from "@/components/ui/skeleton";

export default function CaseDetailLoading() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center border-b px-6">
        <Skeleton className="h-4 w-40" />
      </header>
      <div className="flex flex-1">
        <div className="flex-[2] p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="mt-6 grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="w-[380px] border-l p-4 space-y-3">
          <Skeleton className="h-5 w-16" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-start">
              <Skeleton className="h-10 w-48 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
