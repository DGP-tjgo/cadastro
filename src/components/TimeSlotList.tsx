import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2 } from "lucide-react";

interface TimeSlotListProps {
  availableSlots: string[];
  bookedSlots: string[];
  onSlotSelect: (slot: string) => void;
  isSubmitting: boolean;
}

export function TimeSlotList({
  availableSlots,
  bookedSlots,
  onSlotSelect,
  isSubmitting,
}: TimeSlotListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Horários Disponíveis</h3>
        </div>
        <Badge variant="secondary">
          {availableSlots.length - bookedSlots.length} disponíveis
        </Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {availableSlots.map((slot) => {
            const isBooked = bookedSlots.includes(slot);

            return (
              <Button
                key={slot}
                variant={isBooked ? "secondary" : "outline"}
                disabled={isBooked || isSubmitting}
                onClick={() => !isBooked && onSlotSelect(slot)}
                className="w-full justify-between h-14 text-base font-medium transition-all duration-200 hover:scale-[1.02]"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {slot}
                </span>
                {isBooked ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Ocupado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Disponível
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
