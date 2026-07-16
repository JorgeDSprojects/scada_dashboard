import React from "react";

const DEFAULT_SIGNALS = [
  "Gen_RPM",
  "hydrolic_temp",
  "Gear_oil_temp",
  "Blades_PitchAngle",
  "Windspeed",
  "Prod_pwr",
];
const DEFAULT_COLORS = ["navy", "red", "green", "yellow", "black"];

type SignalSelectorProps = {
  onAdd: (signal: string, color: string) => void;
  signalOptions?: string[];
  colorOptions?: string[];
};

export function SignalSelector({
  onAdd,
  signalOptions = DEFAULT_SIGNALS,
  colorOptions = DEFAULT_COLORS,
}: SignalSelectorProps) {
  const [signal, setSignal] = React.useState(signalOptions[0] ?? "");
  const [color, setColor] = React.useState(colorOptions[0] ?? "");

  return (
    <div>
      <label htmlFor="signal-select">Signal</label>
      <select
        id="signal-select"
        aria-label="signal"
        value={signal}
        onChange={(event) => {
          setSignal(event.target.value);
        }}
      >
        {signalOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <label htmlFor="color-select">Color</label>
      <select
        id="color-select"
        aria-label="color"
        value={color}
        onChange={(event) => {
          setColor(event.target.value);
        }}
      >
        {colorOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          onAdd(signal, color);
        }}
      >
        + Add
      </button>
    </div>
  );
}
