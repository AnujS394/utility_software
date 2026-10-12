import type { Meter } from "./types";

const phase = (seed: number, offset: number) => ({
  voltage: +(219 + ((seed * 1.71 + offset) % 8)).toFixed(2),
  current: +(28 + ((seed * 7.3 + offset * 3) % 55)).toFixed(2),
  kw: +(3 + ((seed * 2.13 + offset) % 12)).toFixed(2),
  pf: +(0.72 + ((seed * 0.031 + offset / 100) % 0.25)).toFixed(2),
});

export function createMeter(id: number, status: Meter["status"] = "Online", mock = true): Meter {
  const online = status === "Online";
  return {
    meterId: id,
    meterType: "LNT_THREE",
    serialNumber: String(217700 + id * 7),
    status,
    parsingStatus: online ? "Auto Parsed" : "Pending",
    deviceTopic: `device/meter-${id}`,
    responseTopic: `device/meter-${id}/response`,
    endpoint: "235.24.54.22:3",
    accessKey: "••••••••••••••••",
    gridLoad: online ? +(31 + ((id * 3.37) % 42)).toFixed(2) : null,
    dgLoad: online ? +(8 + ((id * 1.93) % 20)).toFixed(2) : null,
    totalPower: online ? +(67 + ((id * 5.21) % 71)).toFixed(2) : null,
    powerFactor: online ? +(0.78 + ((id * 0.017) % 0.19)).toFixed(2) : null,
    frequency: online ? +(49.1 + ((id * 0.07) % 1.5)).toFixed(1) : null,
    currentSource: online ? (id % 3 === 0 ? "DG" : "Grid") : null,
    gridReading: online ? +(26000 + id * 269.54).toFixed(4) : null,
    dgReading: online ? +(3100 + id * 139.62).toFixed(4) : null,
    powerKVA: online ? +(20 + ((id * 2.91) % 34)).toFixed(2) : null,
    phases: online
      ? { R: phase(id, 1), Y: phase(id, 2), B: phase(id, 3) }
      : {
          R: { voltage: null, current: null, kw: null, pf: null },
          Y: { voltage: null, current: null, kw: null, pf: null },
          B: { voltage: null, current: null, kw: null, pf: null },
        },
    lastUpdated: new Date(Date.now() - id * 47000).toISOString(),
    isMockData: mock,
  };
}

export const referenceMeter: Meter = {
  ...createMeter(18),
  serialNumber: "217763",
  gridLoad: 51.09,
  dgLoad: 14.88,
  totalPower: 115.84,
  powerFactor: 0.93,
  frequency: 49.4,
  currentSource: "DG",
  gridReading: 30849.7804,
  dgReading: 5613.4151,
  powerKVA: 26.37,
  phases: {
    R: { voltage: 223.16, current: 48.05, kw: 3.23, pf: 0.77 },
    Y: { voltage: 223.76, current: 48.2, kw: 10.87, pf: 0.91 },
    B: { voltage: 224.31, current: 71.56, kw: 5.75, pf: 0.72 },
  },
};

export const initialMeters = [
  referenceMeter,
  createMeter(19, "Online"),
  createMeter(20, "Offline"),
  createMeter(21, "Online"),
  createMeter(22, "Error"),
  createMeter(23, "Online"),
  createMeter(24, "Offline"),
  createMeter(25, "Online"),
  createMeter(26, "Online"),
  createMeter(27, "Offline"),
  createMeter(28, "Online"),
  createMeter(29, "Error"),
];

export function generateMeters(count: number): Meter[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const status = id % 9 === 0 ? "Error" : id % 5 === 0 ? "Offline" : "Online";
    return id === 18 ? referenceMeter : createMeter(id, status);
  });
}
