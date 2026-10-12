export type MeterStatus = "Online" | "Offline" | "Error" | "Unknown" | "Connecting"
export type Operation = "READ" | "CONNECT" | "DISCONNECT" | "SET_LOAD" | "REMOVE"

export interface PhaseReading {
  voltage: number | null
  current: number | null
  kw: number | null
  pf: number | null
}

export interface Meter {
  meterId: number
  meterType: string
  serialNumber: string
  status: MeterStatus
  parsingStatus: string
  deviceTopic: string
  responseTopic: string
  endpoint: string
  accessKey: string
  gridLoad: number | null
  dgLoad: number | null
  totalPower: number | null
  powerFactor: number | null
  frequency: number | null
  currentSource: string | null
  gridReading: number | null
  dgReading: number | null
  powerKVA: number | null
  phases: { R: PhaseReading; Y: PhaseReading; B: PhaseReading }
  lastUpdated: string
  isMockData: boolean
}

export interface OperationLog {
  id: string
  time: string
  operation: Operation
  deviceTopic: string
  endpoint: string
  meterId: number
  status: "Success" | "Failed" | "Pending"
  responseTime: number
  details: string
}

export interface SavedRequest {
  id: string
  name: string
  operation: Exclude<Operation, "REMOVE">
  meterIds: number[]
  endpoint: string
  deviceTopic: string
  createdAt: string
}

export interface EndpointConfig {
  id: string
  name: string
  host: string
  port: number
  protocol: "MQTT" | "MQTT/TLS"
  status: "Untested" | "Testing" | "Connected" | "Failed"
  lastMessage?: string
}

export interface AccessKey {
  id: string
  name: string
  value: string
  createdAt: string
  status: "Active" | "Revoked"
}

export type Page = "Dashboard" | "Request Builder" | "Response Viewer" | "Meter Monitor" | "Operation Logs" | "Saved Requests" | "Endpoints" | "Access Keys" | "Settings" | "Excel View" | "Multi Meter View" | "Meter Details" | "Profile" | "Read" | "Connect" | "Disconnect" | "Set Load" | "Remove Meter" | "Complaints" | "Visitors" | "Predictive Maintenance" | "Society Chatbot" | "Maintenance"
