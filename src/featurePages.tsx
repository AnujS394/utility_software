import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Bot,
  Check,
  ClipboardCheck,
  Copy,
  CreditCard,
  HardHat,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Network,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  Wrench,
} from "lucide-react"
import type {
  AccessKey,
  EndpointConfig,
  Meter,
  Operation,
  Page,
  SavedRequest,
} from "./types"
import { Button, Heading, Input, Select, Textarea } from "./ui"

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`badge badge-${value.toLowerCase().replace(/ /g, "-").replace(/\//g, "-")}`}
    >
      <span className="status-dot" />
      {value}
    </span>
  )
}

export function OperationPage({
  page,
  meters,
  connected,
  busy,
  onRun,
}: {
  page: "Read" | "Connect" | "Disconnect" | "Set Load" | "Remove Meter"
  meters: Meter[]
  connected: boolean
  busy: boolean
  onRun: (operation: Operation, meterId: number, load?: number) => Promise<void>
}) {
  const [meterId, setMeterId] = useState(meters[0]?.meterId ?? 0)
  const [load, setLoad] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const meter = meters.find((item) => item.meterId === meterId)
  const operation: Operation =
    page === "Read"
      ? "READ"
      : page === "Connect"
        ? "CONNECT"
        : page === "Disconnect"
          ? "DISCONNECT"
          : page === "Set Load"
            ? "SET_LOAD"
            : "REMOVE"
  const loadValue = Number(load)
  const invalidLoad =
    operation === "SET_LOAD" &&
    (!load.trim() || !Number.isFinite(loadValue) || loadValue < 0)
  const invalidState =
    !meter ||
    (operation === "READ" && meter.status !== "Online") ||
    (operation === "DISCONNECT" && meter.status !== "Online") ||
    (operation === "CONNECT" && meter.status === "Online") ||
    (operation === "REMOVE" && !confirmed)
  const descriptions = {
    Read: "Request current telemetry and inspect the timestamped response.",
    Connect: "Connect a configured meter through the active mock MQTT service.",
    Disconnect: "Safely disconnect an online meter.",
    "Set Load":
      "Submit a simulated load-test value. This does not control physical hardware.",
    "Remove Meter":
      "Review a meter and permanently remove it from this workspace.",
  }
  return (
    <main className="page-content operation-layout">
      <section className="card operation-card">
        <div className="section-head">
          <div>
            <Heading level={2}>{page}</Heading>
            <p>{descriptions[page]}</p>
          </div>
          <Badge value="Test / Mock Data" />
        </div>
        <div className="operation-form">
          <label>
            Meter
            <Select
              value={meterId}
              onChange={(event) => {
                setMeterId(Number(event.target.value))
                setConfirmed(false)
              }}
            >
              {meters.map((item) => (
                <option key={item.meterId} value={item.meterId}>
                  #{item.meterId} · {item.serialNumber} · {item.status}
                </option>
              ))}
            </Select>
          </label>
          {operation === "SET_LOAD" && (
            <label>
              Target load (kW)
              <Input
                type="number"
                min="0"
                step="0.01"
                value={load}
                onChange={(event) => setLoad(event.target.value)}
                placeholder="Enter target load"
              />
              <small className="helper">
                TEST / MOCK operation only. A real broker integration is not
                configured.
              </small>
            </label>
          )}
          {operation === "REMOVE" && (
            <label className="confirm-check">
              <Input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I understand this removes the meter from local workspace data.
            </label>
          )}
          {meter && (
            <div className="review-panel">
              <div>
                <span>Meter ID</span>
                <strong>#{meter.meterId}</strong>
              </div>
              <div>
                <span>Serial</span>
                <strong>{meter.serialNumber}</strong>
              </div>
              <div>
                <span>Status</span>
                <Badge value={meter.status} />
              </div>
              <div>
                <span>Endpoint</span>
                <strong>{meter.endpoint}</strong>
              </div>
              <div>
                <span>Broker session</span>
                <Badge value={connected ? "Connected" : "Offline"} />
              </div>
              <div>
                <span>Data source</span>
                <strong>TEST / MOCK DATA</strong>
              </div>
            </div>
          )}
          {!meters.length && (
            <div className="empty-inline">No meters are configured.</div>
          )}
          {invalidLoad && load.length > 0 && (
            <p className="error-text">Enter a non-negative numeric load.</p>
          )}
        </div>
        <div className="form-actions">
          <Button
            className={operation === "REMOVE" ? "btn-danger" : "btn-primary"}
            disabled={busy || invalidState || invalidLoad}
            onClick={() =>
              meter &&
              void onRun(
                operation,
                meter.meterId,
                operation === "SET_LOAD" ? loadValue : undefined,
              )
            }
          >
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : operation === "REMOVE" ? (
              <Trash2 size={15} />
            ) : (
              <Send size={15} />
            )}
            {busy ? "Processing..." : page}
          </Button>
        </div>
      </section>
    </main>
  )
}

export function SavedRequestsPage({
  requests,
  onRun,
  onCopy,
  onDelete,
}: {
  requests: SavedRequest[]
  onRun: (request: SavedRequest) => void
  onCopy: (request: SavedRequest) => void
  onDelete: (request: SavedRequest) => void
}) {
  return (
    <main className="page-content">
      <div className="tiles">
        {requests.map((request) => (
          <article className="card saved-card" key={request.id}>
            <div>
              <span className="eyebrow">{request.operation} REQUEST</span>
              <Heading level={3}>{request.name}</Heading>
              <p>
                {request.deviceTopic} · {request.endpoint} ·{" "}
                {request.meterIds.length} meter(s)
              </p>
            </div>
            <div>
              <Button className="btn-primary" onClick={() => onRun(request)}>
                <Send size={14} />
                Run
              </Button>
              <Button
                className="icon-btn ghost"
                title="Duplicate request"
                onClick={() => onCopy(request)}
              >
                <Copy size={14} />
              </Button>
              <Button
                className="icon-btn ghost danger"
                title="Delete request"
                onClick={() => onDelete(request)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!requests.length && (
        <div className="card empty-page">
          <ClipboardCheck size={32} />
          <Heading level={3}>No saved requests</Heading>
          <p>Save a valid request from Request Builder to reuse it here.</p>
        </div>
      )}
    </main>
  )
}

export function EndpointsPage({
  endpoints,
  onChange,
  notify,
}: {
  endpoints: EndpointConfig[]
  onChange: (items: EndpointConfig[]) => void
  notify: (message: string, error?: boolean) => void
}) {
  const [testing, setTesting] = useState<string | null>(null)
  const test = async (endpoint: EndpointConfig) => {
    if (!endpoint.host.trim() || endpoint.port < 1 || endpoint.port > 65535) {
      notify("Enter a valid host and port before testing.", true)
      return
    }
    setTesting(endpoint.id)
    onChange(
      endpoints.map((item) =>
        item.id === endpoint.id ? { ...item, status: "Testing" } : item,
      ),
    )
    await new Promise((resolve) => window.setTimeout(resolve, 550))
    const updated = endpoints.map((item) =>
      item.id === endpoint.id
        ? {
            ...item,
            status: "Connected" as const,
            lastMessage:
              "Mock service accepted the validated configuration. No network broker was contacted.",
          }
        : item,
    )
    onChange(updated)
    setTesting(null)
    notify("Connection configuration validated in Test Mode.")
  }
  return (
    <main className="page-content">
      <section className="card">
        <div className="section-head">
          <div>
            <Heading level={2}>MQTT endpoints</Heading>
            <p>
              Validated locally in Test Mode; no real broker connection is
              claimed.
            </p>
          </div>
          <Button
            className="btn-primary"
            onClick={() =>
              onChange([
                ...endpoints,
                {
                  id: crypto.randomUUID(),
                  name: "New endpoint",
                  host: "",
                  port: 8883,
                  protocol: "MQTT/TLS",
                  status: "Untested",
                },
              ])
            }
          >
            <Plus size={15} />
            Add endpoint
          </Button>
        </div>
        {endpoints.map((endpoint) => (
          <div className="endpoint-editor" key={endpoint.id}>
            <div className="endpoint-icon">
              <Network />
            </div>
            <Input
              aria-label="Endpoint name"
              value={endpoint.name}
              onChange={(event) =>
                onChange(
                  endpoints.map((item) =>
                    item.id === endpoint.id
                      ? {
                          ...item,
                          name: event.target.value,
                          status: "Untested",
                        }
                      : item,
                  ),
                )
              }
            />
            <Input
              aria-label="Host"
              value={endpoint.host}
              placeholder="Broker host"
              onChange={(event) =>
                onChange(
                  endpoints.map((item) =>
                    item.id === endpoint.id
                      ? {
                          ...item,
                          host: event.target.value,
                          status: "Untested",
                        }
                      : item,
                  ),
                )
              }
            />
            <Input
              aria-label="Port"
              type="number"
              value={endpoint.port}
              onChange={(event) =>
                onChange(
                  endpoints.map((item) =>
                    item.id === endpoint.id
                      ? {
                          ...item,
                          port: Number(event.target.value),
                          status: "Untested",
                        }
                      : item,
                  ),
                )
              }
            />
            <Select
              value={endpoint.protocol}
              onChange={(event) =>
                onChange(
                  endpoints.map((item) =>
                    item.id === endpoint.id
                      ? {
                          ...item,
                          protocol: event.target
                            .value as EndpointConfig["protocol"],
                          status: "Untested",
                        }
                      : item,
                  ),
                )
              }
            >
              <option>MQTT/TLS</option>
              <option>MQTT</option>
            </Select>
            <Badge value={endpoint.status} />
            <Button
              className="btn-secondary"
              disabled={testing === endpoint.id}
              onClick={() => void test(endpoint)}
            >
              {testing === endpoint.id ? (
                <LoaderCircle className="spin" size={14} />
              ) : (
                <Network size={14} />
              )}
              Test connection
            </Button>
            <Button
              className="icon-btn ghost danger"
              onClick={() =>
                window.confirm(`Delete endpoint "${endpoint.name}"?`) &&
                onChange(endpoints.filter((item) => item.id !== endpoint.id))
              }
            >
              <Trash2 size={14} />
            </Button>
            {endpoint.lastMessage && (
              <small className="endpoint-message">{endpoint.lastMessage}</small>
            )}
          </div>
        ))}
      </section>
    </main>
  )
}

export function AccessKeysPage({
  keys,
  onChange,
  notify,
}: {
  keys: AccessKey[]
  onChange: (items: AccessKey[]) => void
  notify: (message: string, error?: boolean) => void
}) {
  const copy = async (key: AccessKey) => {
    if (key.status === "Revoked") {
      notify("Revoked credentials cannot be copied or used.", true)
      return
    }
    try {
      await navigator.clipboard.writeText(key.value)
      notify("Access key copied securely.")
    } catch {
      notify("Clipboard access was denied.", true)
    }
  }
  return (
    <main className="page-content">
      <section className="card">
        <div className="section-head">
          <div>
            <Heading level={2}>Access keys</Heading>
            <p>Revoked keys are immediately disabled and cannot be copied.</p>
          </div>
          <Button
            className="btn-primary"
            onClick={() =>
              onChange([
                ...keys,
                {
                  id: crypto.randomUUID(),
                  name: `Test key ${keys.length + 1}`,
                  value: crypto.randomUUID().replace(/-/g, ""),
                  createdAt: new Date().toISOString(),
                  status: "Active",
                },
              ])
            }
          >
            <Plus size={15} />
            Add test key
          </Button>
        </div>
        {keys.map((key) => (
          <div className="endpoint-row" key={key.id}>
            <div className="endpoint-icon">
              <KeyRound />
            </div>
            <div>
              <Heading level={3}>{key.name}</Heading>
              <p>
                ••••••••••••{key.value.slice(-4)} · Created{" "}
                {new Date(key.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge value={key.status} />
            <Button
              className="btn-secondary"
              disabled={key.status === "Revoked"}
              onClick={() => void copy(key)}
            >
              <Copy size={14} />
              Copy
            </Button>
            <Button
              className="btn-danger"
              disabled={key.status === "Revoked"}
              onClick={() =>
                window.confirm(
                  `Revoke "${key.name}"? This cannot be undone.`,
                ) &&
                onChange(
                  keys.map((item) =>
                    item.id === key.id ? { ...item, status: "Revoked" } : item,
                  ),
                )
              }
            >
              Revoke
            </Button>
          </div>
        ))}
      </section>
    </main>
  )
}

export function SettingsPage({
  notify,
}: {
  notify: (message: string) => void
}) {
  const initial = JSON.parse(
    localStorage.getItem("mqtt-settings") ?? "null",
  ) ?? {
    broker: "broker.hivemq.com",
    port: "8883",
    timeout: "10",
    refresh: "12",
    rows: "25",
    theme: "Light",
    notifications: "Enabled",
    retention: "30",
  }
  const [values, setValues] = useState<Record<string, string>>(initial)
  const field = (key: string, label: string, type = "text") => (
    <label>
      {label}
      <Input
        type={type}
        value={values[key]}
        onChange={(event) =>
          setValues({ ...values, [key]: event.target.value })
        }
      />
    </label>
  )
  const save = () => {
    if (
      !values.broker.trim() ||
      Number(values.port) < 1 ||
      Number(values.port) > 65535
    ) {
      notify("Settings contain an invalid broker or port.")
      return
    }
    localStorage.setItem("mqtt-settings", JSON.stringify(values))
    notify("Settings saved to this browser.")
  }
  return (
    <main className="page-content settings-layout">
      <section className="card settings-card">
        <Heading level={2}>Connection configuration</Heading>
        {field("broker", "Broker host")}
        {field("port", "Port", "number")}
        {field("timeout", "Timeout (seconds)", "number")}
        <label>
          Theme
          <Select
            value={values.theme}
            onChange={(event) =>
              setValues({ ...values, theme: event.target.value })
            }
          >
            <option>Light</option>
            <option>System</option>
          </Select>
        </label>
      </section>
      <section className="card settings-card">
        <Heading level={2}>Application preferences</Heading>
        {field("refresh", "Refresh interval (seconds)", "number")}
        {field("rows", "Rows per page", "number")}
        {field("retention", "Log retention (days)", "number")}
        <label>
          Notifications
          <Select
            value={values.notifications}
            onChange={(event) =>
              setValues({ ...values, notifications: event.target.value })
            }
          >
            <option>Enabled</option>
            <option>Disabled</option>
          </Select>
        </label>
      </section>
      <div className="settings-save">
        <Button className="btn-primary" onClick={save}>
          <Save size={15} />
          Save settings
        </Button>
      </div>
    </main>
  )
}

export function ProfilePage({ notify }: { notify: (message: string) => void }) {
  const [profile, setProfile] = useState(
    () =>
      JSON.parse(localStorage.getItem("mqtt-profile") ?? "null") ?? {
        name: "Operations Administrator",
        email: "admin@example.test",
        role: "Administrator",
      },
  )
  const [password, setPassword] = useState("")
  return (
    <main className="page-content profile-grid">
      <section className="card settings-card">
        <Heading level={2}>Profile details</Heading>
        <label>
          Display name
          <Input
            value={profile.name}
            onChange={(event) =>
              setProfile({ ...profile, name: event.target.value })
            }
          />
        </label>
        <label>
          Email
          <Input
            type="email"
            value={profile.email}
            onChange={(event) =>
              setProfile({ ...profile, email: event.target.value })
            }
          />
        </label>
        <label>
          Role
          <Input value={profile.role} disabled />
        </label>
        <div className="settings-save">
          <Button
            className="btn-primary"
            disabled={!profile.name || !profile.email.includes("@")}
            onClick={() => {
              localStorage.setItem("mqtt-profile", JSON.stringify(profile))
              notify("Profile saved.")
            }}
          >
            <Save size={15} />
            Save profile
          </Button>
        </div>
      </section>
      <section className="card settings-card">
        <Heading level={2}>Security</Heading>
        <label>
          New password
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
        </label>
        <p className="helper">
          Password changes require an authentication backend, which is not
          configured.
        </p>
        <div className="settings-save">
          <Button
            className="btn-secondary"
            disabled={password.length < 8}
            onClick={() =>
              notify(
                "Unavailable: connect an authentication backend to change passwords.",
              )
            }
          >
            <LockKeyhole size={15} />
            Update password
          </Button>
        </div>
      </section>
    </main>
  )
}

type Complaint = {
  id: string
  description: string
  category: string
  priority: string
  status: string
  corrected: boolean
}
type Visitor = {
  id: string
  name: string
  resident: string
  purpose: string
  status: string
  checkIn?: string
  checkOut?: string
}
type Asset = {
  id: string
  name: string
  condition: string
  lastService: string
  risk: string
}
type Maintenance = {
  id: string
  title: string
  resident: string
  amount: number
  status: string
  type: string
}

function useLocalRecords<T>(key: string, fallback: T[]) {
  const [records, setRecords] = useState<T[]>(
    () => JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback,
  )
  const update = (next: T[]) => {
    setRecords(next)
    localStorage.setItem(key, JSON.stringify(next))
  }
  return [records, update] as const
}

export function SocietyPage({
  page,
  notify,
}: {
  page: Extract<Page, "Complaints" | "Visitors" | "Predictive Maintenance" | "Society Chatbot" | "Maintenance">
  notify: (message: string) => void
}) {
  if (page === "Complaints") return <ComplaintsPage notify={notify} />
  if (page === "Visitors") return <VisitorsPage notify={notify} />
  if (page === "Predictive Maintenance")
    return <PredictivePage notify={notify} />
  if (page === "Society Chatbot") return <ChatbotPage />
  return <MaintenancePage notify={notify} />
}

function classify(text: string) {
  const value = text.toLowerCase()
  const category = /leak|water|power|electric|meter/.test(value)
    ? "Utilities"
    : /guard|theft|gate|security/.test(value)
      ? "Security"
      : /park|vehicle/.test(value)
        ? "Parking"
        : /clean|garbage|housekeep/.test(value)
          ? "Housekeeping"
          : "Maintenance"
  const priority = /urgent|danger|fire|sparks|flood/.test(value)
    ? "High"
    : /soon|broken|not working/.test(value)
      ? "Medium"
      : "Low"
  return { category, priority }
}

function ComplaintsPage({ notify }: { notify: (message: string) => void }) {
  const [records, setRecords] = useLocalRecords<Complaint>(
    "society-complaints",
    [],
  )
  const [description, setDescription] = useState("")
  const [attachment, setAttachment] = useState("")
  const submit = () => {
    if (description.trim().length < 10) return
    const result = classify(description)
    setRecords([
      {
        id: crypto.randomUUID(),
        description,
        ...result,
        status: "Open",
        corrected: false,
      },
      ...records,
    ])
    setDescription("")
    setAttachment("")
    notify("Complaint classified locally using TEST / MOCK rules.")
  }
  return (
    <SocietyShell
      title="AI Complaint Classification"
      icon={Bot}
      note="Classification uses transparent local keyword rules in Test Mode; no external AI service is connected."
    >
      <div className="society-form">
        <label>
          Description
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue, location, and urgency"
          />
        </label>
        <label>
          Optional attachment
          <Input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) =>
              setAttachment(event.target.files?.[0]?.name ?? "")
            }
          />
          <small>{attachment || "No file selected"}</small>
        </label>
        <Button
          className="btn-primary"
          disabled={description.trim().length < 10}
          onClick={submit}
        >
          <Send size={14} />
          Submit and classify
        </Button>
      </div>
      <RecordTable
        headers={["Complaint", "Category", "Priority", "Status", "Review"]}
        rows={records.map((record) => [
          record.description,
          <Select
            value={record.category}
            onChange={(event) =>
              setRecords(
                records.map((item) =>
                  item.id === record.id
                    ? { ...item, category: event.target.value, corrected: true }
                    : item,
                ),
              )
            }
          >
            <option>Maintenance</option>
            <option>Security</option>
            <option>Housekeeping</option>
            <option>Parking</option>
            <option>Utilities</option>
          </Select>,
          <Badge value={record.priority} />,
          <Select
            value={record.status}
            onChange={(event) =>
              setRecords(
                records.map((item) =>
                  item.id === record.id
                    ? { ...item, status: event.target.value }
                    : item,
                ),
              )
            }
          >
            <option>Open</option>
            <option>Assigned</option>
            <option>Resolved</option>
          </Select>,
          record.corrected ? "Admin corrected" : "AI suggestion",
        ])}
        empty="No complaints submitted."
      />
    </SocietyShell>
  )
}

function VisitorsPage({ notify }: { notify: (message: string) => void }) {
  const [records, setRecords] = useLocalRecords<Visitor>("society-visitors", [])
  const [form, setForm] = useState({ name: "", resident: "", purpose: "" })
  const submit = () => {
    if (!form.name || !form.resident) return
    setRecords([
      { id: crypto.randomUUID(), ...form, status: "Pending approval" },
      ...records,
    ])
    setForm({ name: "", resident: "", purpose: "" })
    notify(
      "Visitor request recorded; resident notification requires a backend.",
    )
  }
  return (
    <SocietyShell
      title="Smart Visitor Management"
      icon={Users}
      note="Sensitive visitor records are stored only in this browser. Production use requires authentication and role-based backend access."
    >
      <div className="society-form row">
        <Input
          placeholder="Visitor name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          placeholder="Resident / unit"
          value={form.resident}
          onChange={(e) => setForm({ ...form, resident: e.target.value })}
        />
        <Input
          placeholder="Purpose"
          value={form.purpose}
          onChange={(e) => setForm({ ...form, purpose: e.target.value })}
        />
        <Button
          className="btn-primary"
          disabled={!form.name || !form.resident}
          onClick={submit}
        >
          <Plus size={14} />
          Register
        </Button>
      </div>
      <RecordTable
        headers={["Visitor", "Resident", "Purpose", "Status", "Access action"]}
        rows={records.map((record) => [
          record.name,
          record.resident,
          record.purpose || "—",
          <Badge value={record.status} />,
          <Button
            className="btn-secondary"
            onClick={() =>
              setRecords(
                records.map((item) =>
                  item.id === record.id
                    ? {
                        ...item,
                        status:
                          record.status === "Pending approval"
                            ? "Approved"
                            : !record.checkIn
                              ? "Checked in"
                              : "Checked out",
                        checkIn:
                          record.status === "Approved"
                            ? new Date().toISOString()
                            : record.checkIn,
                        checkOut: record.checkIn
                          ? new Date().toISOString()
                          : record.checkOut,
                      }
                    : item,
                ),
              )
            }
          >
            {record.status === "Pending approval"
              ? "Approve"
              : !record.checkIn
                ? "Check in"
                : "Check out"}
          </Button>,
        ])}
        empty="No visitor records."
      />
    </SocietyShell>
  )
}

function PredictivePage({ notify }: { notify: (message: string) => void }) {
  const [records, setRecords] = useLocalRecords<Asset>("society-assets", [
    {
      id: crypto.randomUUID(),
      name: "Lift A",
      condition: "Inspection due",
      lastService: "2026-01-12",
      risk: "Insufficient data",
    },
  ])
  const [name, setName] = useState("")
  return (
    <SocietyShell
      title="Predictive Maintenance"
      icon={HardHat}
      note="No predictive model or sensor history is connected. Risk remains “Insufficient data” rather than a fabricated prediction."
    >
      <div className="society-form row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Equipment / asset name"
        />
        <Button
          className="btn-primary"
          disabled={!name}
          onClick={() => {
            setRecords([
              ...records,
              {
                id: crypto.randomUUID(),
                name,
                condition: "Not assessed",
                lastService: "—",
                risk: "Insufficient data",
              },
            ])
            setName("")
            notify("Asset added.")
          }}
        >
          <Plus size={14} />
          Add asset
        </Button>
      </div>
      <RecordTable
        headers={[
          "Asset",
          "Condition",
          "Last service",
          "Maintenance risk",
          "Recommended action",
        ]}
        rows={records.map((record) => [
          record.name,
          record.condition,
          record.lastService,
          <Badge value={record.risk} />,
          "Connect service history and sensors",
        ])}
        empty="No assets configured."
      />
    </SocietyShell>
  )
}

function ChatbotPage() {
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([])
  const answer = () => {
    const q = question.toLowerCase()
    const text = q.includes("complaint")
      ? "Open Society Management → Complaints to submit and track a complaint."
      : q.includes("visitor")
        ? "Open Society Management → Visitors to register or approve a visitor."
        : q.includes("maintenance")
          ? "Open Society Management → Maintenance to review requests and payment status."
          : "I can’t find that information in the authorized local knowledge source. Contact the society administrator."
    setMessages([
      ...messages,
      { role: "You", text: question },
      { role: "Assistant", text },
    ])
    setQuestion("")
  }
  return (
    <SocietyShell
      title="Society AI Chatbot"
      icon={Bot}
      note="This assistant uses only the limited in-app navigation knowledge shown here. No society documents, financial data, or external AI service are connected."
    >
      <div className="chat-log">
        {messages.length ? (
          messages.map((message, index) => (
            <div
              className={`chat-message ${message.role === "You" ? "user" : ""}`}
              key={index}
            >
              <strong>{message.role}</strong>
              <p>{message.text}</p>
            </div>
          ))
        ) : (
          <div className="empty-inline">
            Ask about complaints, visitors, or maintenance.
          </div>
        )}
      </div>
      <div className="chat-compose">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && question.trim() && answer()}
          placeholder="Ask a society question"
        />
        <Button
          className="btn-primary"
          disabled={!question.trim()}
          onClick={answer}
        >
          <Send size={14} />
          Send
        </Button>
      </div>
    </SocietyShell>
  )
}

function MaintenancePage({ notify }: { notify: (message: string) => void }) {
  const [records, setRecords] = useLocalRecords<Maintenance>(
    "society-maintenance",
    [],
  )
  const [query, setQuery] = useState("")
  const [title, setTitle] = useState("")
  const shown = useMemo(
    () =>
      records.filter((item) =>
        `${item.title} ${item.resident} ${item.status}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [records, query],
  )
  return (
    <SocietyShell
      title="Maintenance Management"
      icon={Wrench}
      note="Payment entries are TEST / MOCK records. No payment gateway or accounting backend is connected."
    >
      <div className="maintenance-stats">
        <div>
          <span>Pending tasks</span>
          <strong>
            {records.filter((x) => x.status === "Pending").length}
          </strong>
        </div>
        <div>
          <span>Outstanding dues</span>
          <strong>
            ₹
            {records
              .filter((x) => x.status === "Due")
              .reduce((sum, x) => sum + x.amount, 0)
              .toLocaleString()}
          </strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>
            {records.filter((x) => x.status === "Completed").length}
          </strong>
        </div>
      </div>
      <div className="society-form row">
        <div className="search-wrap">
          <Search size={15} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search records"
          />
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New service request"
        />
        <Button
          className="btn-primary"
          disabled={!title}
          onClick={() => {
            setRecords([
              {
                id: crypto.randomUUID(),
                title,
                resident: "Current resident",
                amount: 0,
                status: "Pending",
                type: "Service request",
              },
              ...records,
            ])
            setTitle("")
            notify("Service request added.")
          }}
        >
          <Plus size={14} />
          Submit request
        </Button>
      </div>
      <RecordTable
        headers={["Request / charge", "Resident", "Type", "Amount", "Status"]}
        rows={shown.map((record) => [
          record.title,
          record.resident,
          record.type,
          record.amount ? `₹${record.amount.toLocaleString()}` : "—",
          <Select
            value={record.status}
            onChange={(e) =>
              setRecords(
                records.map((item) =>
                  item.id === record.id
                    ? { ...item, status: e.target.value }
                    : item,
                ),
              )
            }
          >
            <option>Pending</option>
            <option>In progress</option>
            <option>Completed</option>
            <option>Due</option>
            <option>Paid</option>
          </Select>,
        ])}
        empty="No maintenance records."
      />
    </SocietyShell>
  )
}

function SocietyShell({
  title,
  icon: Icon,
  note,
  children,
}: {
  title: string
  icon: typeof Bot
  note: string
  children: React.ReactNode
}) {
  return (
    <main className="page-content">
      <section className="card society-page">
        <div className="section-head">
          <div className="society-title">
            <span className="summary-icon tone-purple">
              <Icon size={18} />
            </span>
            <div>
              <Heading level={2}>{title}</Heading>
              <p>Society Management module</p>
            </div>
          </div>
          <Badge value="Test / Mock Data" />
        </div>
        <div className="integration-note">
          <AlertTriangle size={15} />
          <span>{note}</span>
        </div>
        {children}
      </section>
    </main>
  )
}

function RecordTable({
  headers,
  rows,
  empty,
}: {
  headers: string[]
  rows: React.ReactNode[][]
  empty: string
}) {
  return (
    <div className="table-wrap">
      <table className="feature-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="empty-inline">{empty}</div>}
    </div>
  )
}
