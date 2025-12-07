import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Timer, Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PRESET_TIMES = [
  { label: "30s", value: 30 },
  { label: "45s", value: 45 },
  { label: "60s", value: 60 },
  { label: "90s", value: 90 },
  { label: "120s", value: 120 },
  { label: "180s", value: 180 },
];

interface RestTimerProps {
  variant?: "sidebar" | "floating";
}

const STORAGE_KEYS = {
  DURATION: "rest-timer-duration",
  SOUND: "rest-timer-sound",
};

function getStoredDuration(): number {
  if (typeof window === "undefined") return 60;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DURATION);
    if (stored) {
      const value = parseInt(stored, 10);
      if (PRESET_TIMES.some((p) => p.value === value)) {
        return value;
      }
    }
  } catch (e) {}
  return 60;
}

function getStoredSound(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SOUND);
    if (stored !== null) {
      return stored === "true";
    }
  } catch (e) {}
  return true;
}

export function RestTimer({ variant = "sidebar" }: RestTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => getStoredDuration());
  const [timeLeft, setTimeLeft] = useState(() => getStoredDuration());
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => getStoredSound());

  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log("Audio not available");
    }
  }, [soundEnabled]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, playSound]);

  const handleStart = () => {
    if (timeLeft === 0) {
      setTimeLeft(selectedTime);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(selectedTime);
  };

  const handleTimeChange = (value: string) => {
    const newTime = parseInt(value, 10);
    setSelectedTime(newTime);
    if (!isRunning) {
      setTimeLeft(newTime);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.DURATION, newTime.toString());
    } catch (e) {}
  };

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND, newValue.toString());
    } catch (e) {}
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = ((selectedTime - timeLeft) / selectedTime) * 100;
  const isComplete = timeLeft === 0 && !isRunning;

  const TimerContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Select value={selectedTime.toString()} onValueChange={handleTimeChange}>
          <SelectTrigger className="w-[120px]" data-testid="select-timer-duration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESET_TIMES.map((preset) => (
              <SelectItem key={preset.value} value={preset.value.toString()}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSoundToggle}
          data-testid="button-toggle-sound"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="relative pt-4">
        <div className="flex flex-col items-center justify-center">
          <div 
            className={`text-5xl font-mono font-bold tabular-nums ${
              isComplete ? "text-green-500" : timeLeft <= 10 && isRunning ? "text-destructive" : ""
            }`}
            data-testid="text-timer-display"
          >
            {formatTime(timeLeft)}
          </div>
          
          <div className="w-full mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isComplete ? "bg-green-500" : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
              data-testid="progress-timer"
            />
          </div>
          
          {isComplete && (
            <p className="text-green-500 text-sm font-medium mt-2" data-testid="text-timer-complete">
              Czas minął! Rozpocznij następną serię
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2">
        {!isRunning ? (
          <Button onClick={handleStart} className="gap-2" data-testid="button-start-timer">
            <Play className="w-4 h-4" />
            {timeLeft === 0 ? "Restart" : "Start"}
          </Button>
        ) : (
          <Button onClick={handlePause} variant="secondary" className="gap-2" data-testid="button-pause-timer">
            <Pause className="w-4 h-4" />
            Pauza
          </Button>
        )}
        
        <Button onClick={handleReset} variant="outline" size="icon" data-testid="button-reset-timer">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  if (variant === "floating") {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
            data-testid="button-open-timer"
          >
            <Timer className="w-5 h-5" />
            {isRunning && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 min-w-[20px] p-0 flex items-center justify-center text-xs"
              >
                {formatTime(timeLeft)}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[320px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Timer przerwy
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <TimerContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card className="mt-4" data-testid="card-rest-timer">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Timer className="w-4 h-4" />
          Timer przerwy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TimerContent />
      </CardContent>
    </Card>
  );
}

export function RestTimerButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => getStoredDuration());
  const [timeLeft, setTimeLeft] = useState(() => getStoredDuration());
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => getStoredSound());

  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log("Audio not available");
    }
  }, [soundEnabled]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, playSound]);

  const handleStart = () => {
    if (timeLeft === 0) {
      setTimeLeft(selectedTime);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(selectedTime);
  };

  const handleTimeChange = (value: string) => {
    const newTime = parseInt(value, 10);
    setSelectedTime(newTime);
    if (!isRunning) {
      setTimeLeft(newTime);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.DURATION, newTime.toString());
    } catch (e) {}
  };

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND, newValue.toString());
    } catch (e) {}
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = ((selectedTime - timeLeft) / selectedTime) * 100;
  const isComplete = timeLeft === 0 && !isRunning;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover-elevate text-left text-foreground`}
          data-testid="nav-timer-przerwy"
        >
          <div className="flex items-center gap-3">
            <Timer className="w-5 h-5 flex-shrink-0" />
            <span>Timer przerwy</span>
          </div>
          {isRunning && (
            <Badge 
              variant="default" 
              className="text-xs px-2 py-0.5 tabular-nums"
              data-testid="badge-timer-running"
            >
              {formatTime(timeLeft)}
            </Badge>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Timer przerwy
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Select value={selectedTime.toString()} onValueChange={handleTimeChange}>
              <SelectTrigger className="w-[120px]" data-testid="select-timer-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_TIMES.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value.toString()}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSoundToggle}
              data-testid="button-toggle-sound"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="relative pt-4">
            <div className="flex flex-col items-center justify-center">
              <div 
                className={`text-5xl font-mono font-bold tabular-nums ${
                  isComplete ? "text-green-500" : timeLeft <= 10 && isRunning ? "text-destructive" : ""
                }`}
                data-testid="text-timer-display"
              >
                {formatTime(timeLeft)}
              </div>
              
              <div className="w-full mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isComplete ? "bg-green-500" : "bg-primary"
                  }`}
                  style={{ width: `${progress}%` }}
                  data-testid="progress-timer"
                />
              </div>
              
              {isComplete && (
                <p className="text-green-500 text-sm font-medium mt-2" data-testid="text-timer-complete">
                  Czas minął! Rozpocznij następną serię
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            {!isRunning ? (
              <Button onClick={handleStart} className="gap-2" data-testid="button-start-timer">
                <Play className="w-4 h-4" />
                {timeLeft === 0 ? "Restart" : "Start"}
              </Button>
            ) : (
              <Button onClick={handlePause} variant="secondary" className="gap-2" data-testid="button-pause-timer">
                <Pause className="w-4 h-4" />
                Pauza
              </Button>
            )}
            
            <Button onClick={handleReset} variant="outline" size="icon" data-testid="button-reset-timer">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
