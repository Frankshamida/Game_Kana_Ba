"use client";

import { MinusCircle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlayerListEditorProps {
  players: string[];
  onChange: (players: string[]) => void;
}

export function PlayerListEditor({ players, onChange }: PlayerListEditorProps) {
  const updatePlayer = (index: number, value: string) => {
    const next = [...players];
    next[index] = value;
    onChange(next);
  };

  const addPlayer = () => {
    if (players.length >= 20) return;
    onChange([...players, ""]);
  };

  const removePlayer = (index: number) => {
    if (players.length <= 3) return;
    onChange(players.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {players.map((name, index) => (
        <div key={index} className="space-y-2">
          <Label htmlFor={`player-${index}`}>Player {index + 1}</Label>
          <div className="flex gap-2">
            <Input
              id={`player-${index}`}
              value={name}
              onChange={(e) => updatePlayer(index, e.target.value)}
              placeholder="Enter player name"
            />
            {players.length > 3 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => removePlayer(index)}
                aria-label={`Remove player ${index + 1}`}
              >
                <MinusCircle className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={addPlayer}
        disabled={players.length >= 20}
        className="w-full"
      >
        <PlusCircle className="mr-2 h-5 w-5" /> Add Player
      </Button>
    </div>
  );
}
