import React from "react";

import type { DashboardPipeline } from "../../types/dashboard";

type RangePickerProps = {
  pipeline: DashboardPipeline;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

export function RangePicker({ pipeline, from, to, onFromChange, onToChange }: RangePickerProps) {
  if (pipeline === "realtime") {
    return <p>Last 15 minutes</p>;
  }

  return (
    <div>
      <label htmlFor="historian-from">From</label>
      <input
        id="historian-from"
        type="datetime-local"
        value={from}
        onChange={(event) => {
          onFromChange(event.target.value);
        }}
      />

      <label htmlFor="historian-to">To</label>
      <input
        id="historian-to"
        type="datetime-local"
        value={to}
        onChange={(event) => {
          onToChange(event.target.value);
        }}
      />
    </div>
  );
}
