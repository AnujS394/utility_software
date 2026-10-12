import { createMeter } from "../data";
import type { Meter } from "../types";

const wait = (ms = 520) => new Promise((resolve) => setTimeout(resolve, ms));

export interface MqttService {
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  publish(topic: string, payload: unknown): Promise<{ messageId: string; payload: unknown }>;
  subscribe(topic: string): Promise<boolean>;
  readMeter(meter: Meter): Promise<Meter>;
  connectMeter(meter: Meter): Promise<Meter>;
  disconnectMeter(meter: Meter): Promise<Meter>;
  setLoad(meter: Meter, load: number): Promise<Meter>;
}

class MockMqttService implements MqttService {
  async connect() { await wait(); return true; }
  async disconnect() { await wait(250); return true; }
  async publish(_topic: string, payload: unknown) {
    await wait(400);
    return { messageId: crypto.randomUUID(), payload };
  }
  async subscribe(_topic: string) { await wait(180); return true; }
  async readMeter(meter: Meter): Promise<Meter> {
    await wait();
    const vary = (value: number | null, range: number, digits = 2) =>
      value === null ? null : +(value + (Math.random() - 0.5) * range).toFixed(digits);
    const phases = Object.fromEntries(
      Object.entries(meter.phases).map(([name, phase]) => [
        name,
        {
          voltage: vary(phase.voltage, 1.8),
          current: vary(phase.current, 3.6),
          kw: vary(phase.kw, 1.2),
          pf: phase.pf === null ? null : +Math.min(0.99, Math.max(0.6, vary(phase.pf, 0.04) ?? phase.pf)).toFixed(2),
        },
      ]),
    ) as Meter["phases"];
    return {
      ...meter,
      status: "Online" as Meter["status"],
      parsingStatus: "Auto Parsed",
      gridLoad: vary(meter.gridLoad, 5),
      dgLoad: vary(meter.dgLoad, 3),
      totalPower: vary(meter.totalPower, 7),
      powerFactor: meter.powerFactor === null ? null : +Math.min(0.99, Math.max(0.6, vary(meter.powerFactor, 0.03) ?? meter.powerFactor)).toFixed(2),
      frequency: vary(meter.frequency, 0.3, 1),
      gridReading: vary(meter.gridReading, 0.4, 4),
      dgReading: vary(meter.dgReading, 0.3, 4),
      powerKVA: vary(meter.powerKVA, 2),
      phases,
      lastUpdated: new Date().toISOString(),
    } satisfies Meter;
  }
  async connectMeter(meter: Meter) {
    await wait(650);
    return { ...meter, ...createMeter(meter.meterId, "Online", true), serialNumber: meter.serialNumber };
  }
  async disconnectMeter(meter: Meter) {
    await wait(420);
    return {
      ...meter,
      ...createMeter(meter.meterId, "Offline", meter.isMockData),
      serialNumber: meter.serialNumber,
    };
  }
  async setLoad(meter: Meter, load: number) {
    await wait();
    return { ...meter, totalPower: load, lastUpdated: new Date().toISOString() };
  }
}

export const mqttService: MqttService = new MockMqttService();
