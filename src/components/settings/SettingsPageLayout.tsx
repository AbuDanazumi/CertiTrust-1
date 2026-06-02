import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type SettingsTab = { id: string; label: string; content: React.ReactNode };

export function SettingsPageLayout({
  tabs,
  defaultTab,
  className,
}: {
  tabs: SettingsTab[];
  defaultTab?: string;
  className?: string;
}) {
  return (
    <Tabs defaultValue={defaultTab ?? tabs[0]?.id} className={cn("w-full max-w-3xl", className)}>
      <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="text-xs sm:text-sm">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-0 focus-visible:outline-none">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
