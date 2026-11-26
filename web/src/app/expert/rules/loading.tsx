import { Skeleton } from "@/components/ui/skeleton";

export default function RulesLoading() {
  return (
    <div className="flex flex-col">
      <header className="flex h-14 items-center border-b px-6">
        <Skeleton className="h-5 w-16" />
      </header>
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
