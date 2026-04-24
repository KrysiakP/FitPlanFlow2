import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type GlobalExercise = {
  id: string;
  namePl: string;
  nameEn: string;
  muscleGroup: string;
};

interface ExerciseSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: { namePl: string; nameEn: string }) => void;
}

const MUSCLE_GROUPS = [
  { value: "chest", label: "Klatka piersiowa" },
  { value: "back", label: "Plecy" },
  { value: "shoulders", label: "Barki" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "quads", label: "Nogi - przód" },
  { value: "hamstrings", label: "Nogi - tył" },
  { value: "glutes", label: "Pośladki" },
  { value: "core", label: "Brzuch" },
] as const;

export function ExerciseSelectionDialog({
  open,
  onOpenChange,
  onSelect,
}: ExerciseSelectionDialogProps) {
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("chest");
  const [searchQuery, setSearchQuery] = useState("");

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("muscleGroup", selectedMuscleGroup);
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    }
    return `/api/exercises?${params.toString()}`;
  }, [selectedMuscleGroup, searchQuery]);

  const { data: exercises, isLoading, error, refetch } = useQuery<GlobalExercise[]>({
    queryKey: ["/api/exercises", selectedMuscleGroup, searchQuery],
    queryFn: async () => {
      console.log("[ExerciseSelectionDialog] Fetching:", queryUrl);
      const response = await fetch(queryUrl, { credentials: "include" });
      console.log("[ExerciseSelectionDialog] Response status:", response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error("[ExerciseSelectionDialog] Error response:", text);
        throw new Error(`Błąd ${response.status}: ${text || response.statusText}`);
      }
      const data = await response.json();
      console.log("[ExerciseSelectionDialog] Received exercises:", data.length);
      return data;
    },
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  // Force refetch when dialog opens
  useEffect(() => {
    if (open) {
      console.log("[ExerciseSelectionDialog] Dialog opened, triggering refetch");
      refetch();
    }
  }, [open, refetch]);

  const handleExerciseClick = (exercise: GlobalExercise) => {
    onSelect({ namePl: exercise.namePl, nameEn: exercise.nameEn });
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setSearchQuery("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] flex flex-col"
        data-testid="dialog-exercise-selection"
      >
        <DialogHeader>
          <DialogTitle>Wybierz ćwiczenie</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj ćwiczenia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-exercise-search"
          />
        </div>

        <Tabs
          value={selectedMuscleGroup}
          onValueChange={setSelectedMuscleGroup}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex w-max" data-testid="tabs-muscle-groups">
              {MUSCLE_GROUPS.map((group) => (
                <TabsTrigger
                  key={group.value}
                  value={group.value}
                  className="whitespace-nowrap"
                  data-testid={`tab-muscle-${group.value}`}
                >
                  {group.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="space-y-2 p-1">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-14 w-full"
                      data-testid={`skeleton-exercise-${index}`}
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full p-8 space-y-4">
                  <AlertCircle className="w-12 h-12 text-destructive" />
                  <div className="text-center">
                    <p className="font-medium text-destructive mb-2">Błąd ładowania ćwiczeń</p>
                    <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => refetch()}
                    data-testid="button-retry-exercises"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Spróbuj ponownie
                  </Button>
                </div>
              ) : exercises && exercises.length > 0 ? (
                <div className="space-y-1 p-1">
                  {exercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => handleExerciseClick(exercise)}
                      className="w-full text-left p-3 rounded-md hover-elevate active-elevate-2 transition-colors"
                      data-testid={`button-exercise-${exercise.id}`}
                    >
                      <div className="font-medium" data-testid={`text-exercise-name-pl-${exercise.id}`}>
                        {exercise.namePl}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`text-exercise-name-en-${exercise.id}`}>
                        {exercise.nameEn}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground p-8">
                  {searchQuery
                    ? "Nie znaleziono ćwiczeń pasujących do wyszukiwania"
                    : "Brak ćwiczeń w tej grupie mięśniowej"}
                </div>
              )}
            </ScrollArea>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
