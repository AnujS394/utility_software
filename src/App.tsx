import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import * as XLSX from "xlsx"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookMarked,
  Boxes,
  Cable,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Clipboard,
  CloudCog,
  Code2,
  Copy,
  Database,
  Download,
  Eye,
  FileJson,
  Filter,
  Gauge,
  KeyRound,
  LayoutDashboard,
  ListFilter,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Network,
  PanelLeftClose,
  Plug,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Sheet,
  SlidersHorizontal,
  Trash2,
  Unplug,
  UserRound,
  X,
  Zap,
  Bot,
  HardHat,
  Users,
  Wrench,
} from "lucide-react"
import { generateMeters, initialMeters } from "./data"
import { mqttService } from "./services/mqttService"
import type {
  AccessKey,
  EndpointConfig,
  Meter,
  Operation,
  OperationLog,
  Page,
  SavedRequest,
} from "./types"
import { Button, Heading, Input, Select } from "./ui"
import {
  AccessKeysPage,
  EndpointsPage,
  OperationPage,
  ProfilePage,
  SavedRequestsPage,
  SettingsPage,
  SocietyPage,
} from "./featurePages"

const NAV: { name: Page; icon: typeof Activity }[] = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Request Builder", icon: Send },
  { name: "Response Viewer", icon: FileJson },
  { name: "Meter Monitor", icon: Gauge },
  { name: "Operation Logs", icon: ListFilter },
  { name: "Saved Requests", icon: BookMarked },
  { name: "Endpoints", icon: Network },
  { name: "Access Keys", icon: KeyRound },
  { name: "Settings", icon: Settings },
  { name: "Profile", icon: UserRound },
  { name: "Complaints", icon: Bot },
  { name: "Visitors", icon: Users },
  { name: "Predictive Maintenance", icon: HardHat },
  { name: "Society Chatbot", icon: Bot },
  { name: "Maintenance", icon: Wrench },
]

const QUICK: {
  label: string
  icon: typeof Activity
  page?: Page
  action?: Operation | "ALL_READ" | "ALL_CONNECT" | "ALL_DISCONNECT" | "ADD" | "GENERATE" | "DOWNLOAD"
}[] = [
  { label: "READ", icon: Radio, page: "Read" },
  { label: "CONNECT", icon: Plug, page: "Connect" },
  { label: "DISCONNECT", icon: Unplug, page: "Disconnect" },
  { label: "SET LOAD", icon: SlidersHorizontal, page: "Set Load" },
  { label: "ADD METER", icon: Plus, action: "ADD" },
  { label: "REMOVE METER", icon: Trash2, page: "Remove Meter" },
  { label: "READ ALL", icon: RefreshCw, action: "ALL_READ" },
  { label: "CONNECT ALL", icon: Cable, action: "ALL_CONNECT" },
  { label: "DISCONNECT ALL", icon: CircleOff, action: "ALL_DISCONNECT" },
  { label: "GENERATE TEST DATA", icon: Database, action: "GENERATE" },
  { label: "EXCEL VIEW", icon: Sheet, page: "Excel View" },
  { label: "MULTI METER VIEW", icon: Boxes, page: "Multi Meter View" },
  { label: "DOWNLOAD EXCEL", icon: Download, action: "DOWNLOAD" },
]

const fmt = (value: number | null, suffix = "", digits = 2) =>
  value === null || !Number.isFinite(value)
    ? "N/A"
    : `${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}${suffix}`
const shortTime = (value: string) =>
  new Date(value).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`badge badge-${status.toLowerCase().replace(/ /g, "-").replace(/\//g, "-")}`}
    >
      <span className="status-dot" />
      {status}
    </span>
  )
}

function Modal({
  title,
  children,
  onClose,
  size = "",
}: {
  title: string
  children: ReactNode
  onClose: () => void
  size?: string
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={`modal ${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <Heading level={2}>{title}</Heading>
          <Button
            className="icon-btn ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </Button>
        </div>
        {children}
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "blue",
}: {
  label: string
  value: string | number
  note?: string
  icon: typeof Activity
  tone?: string
}) {
  return (
    <article className="summary-card">
      <div className={`summary-icon tone-${tone}`}>
        <Icon size={18} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </article>
  )
}

function JsonViewer({
  value,
  title = "Raw JSON",
}: {
  value: unknown
  title?: string
}) {
  const [expanded, setExpanded] = useState(true)
  const json = JSON.stringify(value, null, 2)
  return (
    <section className="json-panel">
      <div className="json-head">
        <span>
          <Code2 size={15} />
          {title}
        </span>
        <div>
          <Button
            className="code-action"
            onClick={() => navigator.clipboard?.writeText(json)}
          >
            <Copy size={13} /> Copy
          </Button>
          <Button
            className="code-action"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown size={13} />
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </div>
      {expanded && <pre>{json}</pre>}
    </section>
  )
}

function ParsedPanel({
  meters,
  meter,
  onSelect,
  onView,
}: {
  meters: Meter[]
  meter?: Meter
  onSelect: (meter: Meter) => void
  onView: () => void
}) {
  const [query, setQuery] = useState("")
  const matches = query.trim()
    ? meters
        .filter((item) =>
          `${item.meterId} ${item.serialNumber}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 8)
    : []
  const selector = (
    <div className="meter-selector">
      <label>Select Meter</label>
      <div>
        <Search size={15} />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Meter ID or Serial Number"
          aria-label="Select meter"
        />
        {query && (
          <Button
            className="selector-clear"
            onClick={() => setQuery("")}
            aria-label="Clear meter search"
          >
            <X size={14} />
          </Button>
        )}
      </div>
      {matches.length > 0 && (
        <div className="selector-results">
          {matches.map((item) => (
            <Button
              key={item.meterId}
              onClick={() => {
                onSelect(item)
                setQuery("")
              }}
            >
              <span>
                <b>Meter #{item.meterId}</b>
                <small>SN {item.serialNumber}</small>
              </span>
              <StatusBadge status={item.status} />
            </Button>
          ))}
        </div>
      )}
      {query && matches.length === 0 && (
        <div className="selector-results no-results">No matching meters</div>
      )}
    </div>
  )
  if (!meter)
    return (
      <aside className="parsed-panel">
        <span className="eyebrow">PARSED METER DATA</span>
        {selector}
        <div className="panel-empty">
          <Gauge size={32} />
          <Heading level={3}>Select a meter to view its data</Heading>
          <p>
            Search from {meters.length} available meters by Meter ID or Serial
            Number.
          </p>
        </div>
      </aside>
    )
  return (
    <aside className="parsed-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">PARSED METER DATA</span>
          <Heading level={2}>Meter {meter.meterId}</Heading>
        </div>
        <Button className="icon-btn ghost">
          <MoreHorizontal size={18} />
        </Button>
      </div>
      {selector}
      <div className="panel-badges">
        <StatusBadge status={meter.status} />
        {meter.isMockData && <StatusBadge status="Test / Mock Data" />}
      </div>
      <div className="meter-ident">
        <span>{meter.meterType}</span>
        <span>SN {meter.serialNumber}</span>
      </div>
      <div className="parsed-grid">
        <div>
          <small>Grid load</small>
          <strong>{fmt(meter.gridLoad, " kW")}</strong>
        </div>
        <div>
          <small>DG load</small>
          <strong>{fmt(meter.dgLoad, " kW")}</strong>
        </div>
        <div>
          <small>Total power</small>
          <strong>{fmt(meter.totalPower, " kW")}</strong>
        </div>
        <div>
          <small>Power factor</small>
          <strong>{fmt(meter.powerFactor)}</strong>
        </div>
        <div>
          <small>Frequency</small>
          <strong>{fmt(meter.frequency, " Hz", 1)}</strong>
        </div>
        <div>
          <small>Source</small>
          <strong>{meter.currentSource ?? "N/A"}</strong>
        </div>
      </div>
      <div className="phase-mini">
        {(["R", "Y", "B"] as const).map((phase) => (
          <div key={phase}>
            <b>{phase}</b>
            <span>{fmt(meter.phases[phase].voltage, " V")}</span>
            <span>{fmt(meter.phases[phase].current, " A")}</span>
          </div>
        ))}
      </div>
      <Button className="btn-primary full" onClick={onView}>
        <Eye size={15} /> View full meter details
      </Button>
      <div className="updated">
        <RefreshCw size={13} /> Updated {shortTime(meter.lastUpdated)}
      </div>
    </aside>
  )
}

function FilterBar({
  query,
  setQuery,
  status,
  setStatus,
  count,
}: {
  query: string
  setQuery: (v: string) => void
  status: string
  setStatus: (v: string) => void
  count: number
}) {
  return (
    <div className="filter-bar">
      <div className="search-wrap">
        <Search size={16} />
        <Input
          aria-label="Search meters"
          placeholder="Search meter ID, serial or type..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Select
        aria-label="Filter status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="All">All statuses</option>
        <option>Online</option>
        <option>Offline</option>
        <option>Error</option>
        <option>Connecting</option>
      </Select>
      <Button className="btn-secondary">
        <SlidersHorizontal size={15} /> Filters
      </Button>
      <span className="result-count">{count} meters</span>
    </div>
  )
}

function MeterTable({
  meters,
  selected,
  setSelected,
  active,
  onAction,
  onView,
}: {
  meters: Meter[]
  selected: Set<number>
  setSelected: (v: Set<number>) => void
  active?: Meter
  onAction: (op: Operation, ids: number[]) => void
  onView: (m: Meter) => void
}) {
  const [sort, setSort] = useState<keyof Meter>("meterId")
  const sorted = [...meters].sort((a, b) =>
    String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), undefined, {
      numeric: true,
    }),
  )
  const toggleAll = () =>
    setSelected(
      selected.size === meters.length
        ? new Set()
        : new Set(meters.map((m) => m.meterId)),
    )
  return (
    <div className="table-wrap">
      <table className="meter-table">
        <thead>
          <tr>
            <th>
              <Input
                type="checkbox"
                aria-label="Select all"
                checked={meters.length > 0 && selected.size === meters.length}
                onChange={toggleAll}
              />
            </th>
            {([
              ["meterId", "Meter ID"],
              ["meterType", "Type"],
              ["serialNumber", "Serial number"],
              ["status", "Status"],
              ["gridLoad", "Grid load"],
              ["dgLoad", "DG load"],
              ["totalPower", "Total power"],
              ["powerFactor", "PF"],
              ["frequency", "Frequency"],
              ["currentSource", "Source"],
              ["lastUpdated", "Last updated"],
            ] as [keyof Meter, string][]).map(([key, label]) => (
              <th key={key} onClick={() => setSort(key)} className="sortable">
                {label}
                <ChevronDown size={12} />
              </th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((meter) => (
            <tr
              key={meter.meterId}
              className={active?.meterId === meter.meterId ? "active-row" : ""}
            >
              <td onClick={(e) => e.stopPropagation()}>
                <Input
                  type="checkbox"
                  aria-label={`Select meter ${meter.meterId}`}
                  checked={selected.has(meter.meterId)}
                  onChange={() => {
                    const next = new Set(selected)
                    next.has(meter.meterId)
                      ? next.delete(meter.meterId)
                      : next.add(meter.meterId)
                    setSelected(next)
                  }}
                />
              </td>
              <td>
                <strong>#{meter.meterId}</strong>
                {meter.isMockData && <span className="mock-label">MOCK</span>}
              </td>
              <td>{meter.meterType}</td>
              <td>{meter.serialNumber}</td>
              <td>
                <StatusBadge status={meter.status} />
              </td>
              <td>{fmt(meter.gridLoad, " kW")}</td>
              <td>{fmt(meter.dgLoad, " kW")}</td>
              <td className="strong-cell">{fmt(meter.totalPower, " kW")}</td>
              <td>{fmt(meter.powerFactor)}</td>
              <td>{fmt(meter.frequency, " Hz", 1)}</td>
              <td>{meter.currentSource ?? "—"}</td>
              <td>{shortTime(meter.lastUpdated)}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="row-actions">
                  {meter.status === "Online" ? (
                    <Button
                      className="table-action primary"
                      onClick={() => onView(meter)}
                    >
                      <Eye size={14} />
                      View
                    </Button>
                  ) : (
                    <Button
                      className="table-action primary"
                      onClick={() => onAction("CONNECT", [meter.meterId])}
                    >
                      <Plug size={14} />
                      Connect
                    </Button>
                  )}
                  {meter.status === "Online" && (
                    <Button
                      className="icon-btn ghost"
                      title="Disconnect"
                      onClick={() => onAction("DISCONNECT", [meter.meterId])}
                    >
                      <Unplug size={15} />
                    </Button>
                  )}
                  <Button
                    className="icon-btn ghost danger"
                    title="Remove"
                    onClick={() => onAction("REMOVE", [meter.meterId])}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Dashboard({
  meters,
  selected,
  setSelected,
  active,
  setActive,
  onAction,
  onView,
  onRefresh,
  refreshing,
}: {
  meters: Meter[]
  selected: Set<number>
  setSelected: (v: Set<number>) => void
  active?: Meter
  setActive: (m: Meter) => void
  onAction: (op: Operation, ids: number[]) => void
  onView: (m: Meter) => void
  onRefresh: () => void
  refreshing: boolean
}) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("All")
  const filtered = meters.filter(
    (m) =>
      (status === "All" || m.status === status) &&
      `${m.meterId} ${m.meterType} ${m.serialNumber}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  const online = meters.filter((m) => m.status === "Online")
  const sum = (key: "gridLoad" | "dgLoad" | "totalPower") =>
    online.reduce((total, m) => total + (m[key] ?? 0), 0)
  return (
    <div className="dashboard-grid">
      <main className="center-content">
        <div className="stats-grid">
          <SummaryCard
            label="Total meters"
            value={meters.length}
            note="Configured devices"
            icon={Gauge}
          />
          <SummaryCard
            label="Online"
            value={online.length}
            note={`${Math.round((online.length / meters.length) * 100)}% availability`}
            icon={Activity}
            tone="green"
          />
          <SummaryCard
            label="Offline"
            value={meters.filter((m) => m.status === "Offline").length}
            icon={CircleOff}
            tone="slate"
          />
          <SummaryCard
            label="Errors"
            value={meters.filter((m) => m.status === "Error").length}
            icon={AlertTriangle}
            tone="red"
          />
          <SummaryCard
            label="Grid load"
            value={`${sum("gridLoad").toFixed(1)} kW`}
            icon={Zap}
            tone="purple"
          />
          <SummaryCard
            label="DG load"
            value={`${sum("dgLoad").toFixed(1)} kW`}
            icon={CloudCog}
            tone="orange"
          />
          <SummaryCard
            label="Total power"
            value={`${sum("totalPower").toFixed(1)} kW`}
            icon={BarChart3}
            tone="blue"
          />
        </div>
        <section className="card table-card">
          <div className="section-head">
            <div>
              <Heading level={2}>Meter fleet</Heading>
              <p>Monitor and operate all configured LNT meters.</p>
            </div>
            <Button
              className="btn-secondary"
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <RefreshCw size={15} />
              )}
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          <FilterBar
            query={query}
            setQuery={setQuery}
            status={status}
            setStatus={setStatus}
            count={filtered.length}
          />
          {selected.size > 0 && (
            <div className="bulk-bar">
              <span>
                <Check size={15} />
                {selected.size} selected
              </span>
              <Button onClick={() => onAction("READ", [...selected])}>
                <Radio size={14} />
                Read
              </Button>
              <Button onClick={() => onAction("CONNECT", [...selected])}>
                <Plug size={14} />
                Connect
              </Button>
              <Button onClick={() => onAction("DISCONNECT", [...selected])}>
                <Unplug size={14} />
                Disconnect
              </Button>
              <Button
                className="danger"
                onClick={() => onAction("REMOVE", [...selected])}
              >
                <Trash2 size={14} />
                Remove
              </Button>
            </div>
          )}
          <MeterTable
            meters={filtered}
            selected={selected}
            setSelected={setSelected}
            active={active}
            onAction={onAction}
            onView={onView}
          />
          <div className="pagination">
            <span>
              Showing 1–{filtered.length} of {filtered.length}
            </span>
            <div>
              <Button className="icon-btn ghost">
                <ChevronLeft size={15} />
              </Button>
              <Button className="page-active">1</Button>
              <Button className="icon-btn ghost">
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        </section>
      </main>
      <ParsedPanel
        meters={meters}
        meter={active}
        onSelect={setActive}
        onView={() => active && onView(active)}
      />
    </div>
  )
}

function MeterDetails({
  meter,
  onBack,
  onAction,
}: {
  meter: Meter
  onBack: () => void
  onAction: (op: Operation, ids: number[]) => void
}) {
  const [raw, setRaw] = useState(false)
  return (
    <main className="page-content">
      <div className="detail-top">
        <Button className="btn-secondary" onClick={onBack}>
          <ChevronLeft size={16} />
          Back to meters
        </Button>
        <div className="detail-actions">
          <Button
            className="btn-secondary"
            onClick={() => onAction("READ", [meter.meterId])}
          >
            <RefreshCw size={15} />
            Read meter
          </Button>
          <Button
            className={meter.status === "Online" ? "btn-danger" : "btn-primary"}
            onClick={() =>
              onAction(meter.status === "Online" ? "DISCONNECT" : "CONNECT", [
                meter.meterId,
              ])
            }
          >
            {meter.status === "Online" ? (
              <Unplug size={15} />
            ) : (
              <Plug size={15} />
            )}
            {meter.status === "Online" ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </div>
      <section className="meter-hero">
        <div className="hero-icon">
          <Gauge size={28} />
        </div>
        <div>
          <span className="eyebrow">METER PROFILE</span>
          <Heading level={1}>Meter ID: {meter.meterId}</Heading>
          <p>
            {meter.meterType} · Serial {meter.serialNumber}
          </p>
        </div>
        <div className="hero-badges">
          <StatusBadge status={meter.status} />
          <StatusBadge status={meter.parsingStatus} />
          {meter.isMockData && <StatusBadge status="Test / Mock Data" />}
        </div>
      </section>
      <div className="detail-summary">
        {[
          ["Grid load", fmt(meter.gridLoad, " kW")],
          ["DG load", fmt(meter.dgLoad, " kW")],
          ["Total power", fmt(meter.totalPower, " kW")],
          ["Power factor", fmt(meter.powerFactor)],
          ["Frequency", fmt(meter.frequency, " Hz", 1)],
          ["Current source", meter.currentSource ?? "N/A"],
        ].map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="details-layout">
        <div>
          <section className="card details-card">
            <div className="section-head">
              <Heading level={2}>Meter readings</Heading>
              <StatusBadge
                status={meter.isMockData ? "Test / Mock Data" : "Live Data"}
              />
            </div>
            <div className="reading-grid">
              {[
                ["Grid reading", fmt(meter.gridReading, "", 4)],
                ["DG reading", fmt(meter.dgReading, "", 4)],
                ["Serial number", meter.serialNumber],
                ["Power", fmt(meter.powerKVA, " KVA")],
              ].map(([l, v]) => (
                <div key={l}>
                  <span>{l}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="card details-card">
            <Heading level={2}>Phase details</Heading>
            <div className="table-wrap">
              <table className="phase-table">
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th>Voltage</th>
                    <th>Current</th>
                    <th>Power</th>
                    <th>PF</th>
                  </tr>
                </thead>
                <tbody>
                  {(["R", "Y", "B"] as const).map((p) => (
                    <tr key={p}>
                      <td>
                        <b className={`phase phase-${p}`}>{p}</b> Phase
                      </td>
                      <td>{fmt(meter.phases[p].voltage, " V")}</td>
                      <td>{fmt(meter.phases[p].current, " A")}</td>
                      <td>{fmt(meter.phases[p].kw, " kW")}</td>
                      <td>{fmt(meter.phases[p].pf)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <section className="card details-card sticky-meta">
          <Heading level={2}>Connection</Heading>
          <dl>
            <div>
              <dt>Device topic</dt>
              <dd>{meter.deviceTopic}</dd>
            </div>
            <div>
              <dt>Response topic</dt>
              <dd>{meter.responseTopic}</dd>
            </div>
            <div>
              <dt>Endpoint</dt>
              <dd>{meter.endpoint}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{new Date(meter.lastUpdated).toLocaleString()}</dd>
            </div>
          </dl>
        </section>
      </div>
      <section className="card details-card">
        <div className="section-head">
          <div>
            <Heading level={2}>Raw data fields</Heading>
            <p>Parsed MQTT response and metadata.</p>
          </div>
          <Button className="btn-secondary" onClick={() => setRaw(!raw)}>
            <Code2 size={15} />
            {raw ? "Hide fields" : "View all fields"}
          </Button>
        </div>
        {raw && <JsonViewer value={meter} title="Complete meter payload" />}
      </section>
    </main>
  )
}

function RequestBuilder({
  meters,
  active,
  onResponse,
  onSave,
  notify,
}: {
  meters: Meter[]
  active?: Meter
  onResponse: (value: unknown) => void
  onSave: (request: SavedRequest) => void
  notify: (message: string) => void
}) {
  const [operation, setOperation] =
    useState<Exclude<Operation, "REMOVE">>("READ")
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<unknown>(null)
  const [meterId, setMeterId] = useState(
    active?.meterId ?? meters[0]?.meterId ?? 0,
  )
  const meter = meters.find((item) => item.meterId === meterId)
  const [deviceTopic, setDeviceTopic] = useState(meter?.deviceTopic ?? "")
  const [responseTopic, setResponseTopic] = useState(meter?.responseTopic ?? "")
  const [endpoint, setEndpoint] = useState(meter?.endpoint ?? "")
  const [load, setLoad] = useState("")
  const payload = {
    messageId: crypto.randomUUID(),
    mode: "TEST / MOCK DATA",
    endpoint,
    operationType: operation,
    meters: meter
      ? [
          {
            meterId: meter.meterId,
            meterType: meter.meterType,
            ...(operation === "SET_LOAD" ? { load: Number(load) } : {}),
          },
        ]
      : [],
  }
  const valid = Boolean(
    meter &&
      deviceTopic.trim() &&
      responseTopic.trim() &&
      endpoint.trim() &&
      (operation !== "SET_LOAD" ||
        (load.trim() && Number.isFinite(Number(load)) && Number(load) >= 0)),
  )
  const send = async () => {
    if (!valid || !meter) {
      notify("Complete all required request fields.")
      return
    }
    setSending(true)
    try {
      const result = await mqttService.publish(deviceTopic, payload)
      const value = {
        status: "success",
        mode: "TEST / MOCK DATA",
        receivedAt: new Date().toISOString(),
        responseTopic,
        ...result,
      }
      setResponse(value)
      onResponse(value)
      notify("Mock MQTT request completed and response received.")
    } catch (error) {
      const value = {
        status: "failed",
        receivedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown publish error",
      }
      setResponse(value)
      onResponse(value)
      notify("Request failed.")
    } finally {
      setSending(false)
    }
  }
  const chooseMeter = (id: number) => {
    const next = meters.find((item) => item.meterId === id)
    setMeterId(id)
    if (next) {
      setDeviceTopic(next.deviceTopic)
      setResponseTopic(next.responseTopic)
      setEndpoint(next.endpoint)
    }
  }
  return (
    <main className="page-content">
      <div className="request-grid">
        <section className="card request-config">
          <div className="section-head">
            <div>
              <Heading level={2}>Request configuration</Heading>
              <p>Build and publish MQTT operations.</p>
            </div>
            <StatusBadge status="Test / Mock Data" />
          </div>
          <div className="form-grid">
            <label>
              Device topic
              <Input
                value={deviceTopic}
                onChange={(e) => setDeviceTopic(e.target.value)}
              />
            </label>
            <label>
              Response topic
              <Input
                value={responseTopic}
                onChange={(e) => setResponseTopic(e.target.value)}
              />
            </label>
            <label>
              QoS
              <Select defaultValue="1">
                <option>0</option>
                <option>1</option>
                <option>2</option>
              </Select>
            </label>
            <label>
              Mode
              <Input value="TEST / MOCK DATA" disabled />
            </label>
            <label>
              Operation type
              <Select
                value={operation}
                onChange={(e) =>
                  setOperation(e.target.value as Exclude<Operation, "REMOVE">)
                }
              >
                <option>READ</option>
                <option>CONNECT</option>
                <option>DISCONNECT</option>
                <option>SET_LOAD</option>
              </Select>
            </label>
            <label>
              Endpoint
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </label>
            {operation === "SET_LOAD" && (
              <label>
                Load (kW)
                <Input
                  type="number"
                  min="0"
                  value={load}
                  onChange={(e) => setLoad(e.target.value)}
                />
              </label>
            )}
          </div>
          <div className="subsection-head">
            <Heading level={3}>Meter</Heading>
          </div>
          <div className="meter-config-row">
            <Select
              value={meterId}
              onChange={(e) => chooseMeter(Number(e.target.value))}
            >
              {meters.map((item) => (
                <option key={item.meterId} value={item.meterId}>
                  Meter #{item.meterId}
                </option>
              ))}
            </Select>
            <Input value={meter?.meterType ?? "N/A"} disabled />
            <Button
              className="icon-btn ghost"
              disabled
              title="At least one meter is required"
            >
              <Trash2 size={15} />
            </Button>
          </div>
          <div className="form-actions">
            <Button
              className="btn-ghost"
              onClick={() => {
                setDeviceTopic("")
                setResponseTopic("")
                setEndpoint("")
                setResponse(null)
              }}
            >
              Clear
            </Button>
            <Button
              className="btn-secondary"
              disabled={!valid || !meter}
              onClick={() =>
                meter &&
                onSave({
                  id: crypto.randomUUID(),
                  name: `${operation} meter ${meter.meterId}`,
                  operation,
                  meterIds: [meter.meterId],
                  endpoint,
                  deviceTopic,
                  createdAt: new Date().toISOString(),
                })
              }
            >
              <Save size={15} />
              Save request
            </Button>
            <Button
              className="btn-primary"
              onClick={() => void send()}
              disabled={sending || !valid}
            >
              {sending ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Send size={15} />
              )}
              {sending ? "Sending..." : "Run request"}
            </Button>
          </div>
        </section>
        <section className="request-side">
          <div className="section-label">REQUEST PAYLOAD</div>
          <JsonViewer value={payload} title="JSON request" />
        </section>
      </div>
      <section className="card response-section">
        <div className="section-head">
          <div>
            <Heading level={2}>Response message</Heading>
            <p>Raw response from the subscribed topic.</p>
          </div>
          {response !== null && response !== undefined && (
            <StatusBadge status="Received" />
          )}
        </div>
        {response !== null && response !== undefined ? (
          <JsonViewer value={response} title="MQTT response" />
        ) : (
          <div className="empty-inline">
            <FileJson size={28} />
            <span>Send a request to view the response.</span>
          </div>
        )}
      </section>
    </main>
  )
}

function MultiMeter({
  meters,
  onView,
  onAction,
}: {
  meters: Meter[]
  onView: (m: Meter) => void
  onAction: (o: Operation, ids: number[]) => void
}) {
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  return (
    <main className="page-content">
      <FilterBar
        query={query}
        setQuery={setQuery}
        status="All"
        setStatus={() => {}}
        count={meters.length}
      />
      <div className="meter-card-grid">
        {meters
          .filter((m) => `${m.meterId} ${m.serialNumber}`.includes(query))
          .map((meter) => (
            <article className="meter-card" key={meter.meterId}>
              <div className="meter-card-head">
                <div>
                  <span className="eyebrow">METER #{meter.meterId}</span>
                  <Heading level={3}>{meter.meterType}</Heading>
                </div>
                <StatusBadge status={meter.status} />
              </div>
              {meter.isMockData && (
                <div className="mock-banner">TEST / MOCK DATA</div>
              )}
              <div className="meter-card-values">
                {[
                  ["Grid", fmt(meter.gridLoad, " kW")],
                  ["DG", fmt(meter.dgLoad, " kW")],
                  ["Total", fmt(meter.totalPower, " kW")],
                  ["PF", fmt(meter.powerFactor)],
                  ["Frequency", fmt(meter.frequency, " Hz", 1)],
                  ["Source", meter.currentSource ?? "N/A"],
                ].map(([l, v]) => (
                  <div key={l}>
                    <span>{l}</span>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
              {expanded.has(meter.meterId) && (
                <div className="expanded-phases">
                  {(["R", "Y", "B"] as const).map((p) => (
                    <div key={p}>
                      <b>{p}</b>
                      <span>{fmt(meter.phases[p].voltage, " V")}</span>
                      <span>{fmt(meter.phases[p].current, " A")}</span>
                      <span>{fmt(meter.phases[p].kw, " kW")}</span>
                      <span>PF {fmt(meter.phases[p].pf)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="meter-card-actions">
                <Button className="btn-primary" onClick={() => onView(meter)}>
                  <Eye size={14} />
                  View
                </Button>
                <Button
                  className="btn-secondary"
                  onClick={() =>
                    onAction(meter.status === "Online" ? "READ" : "CONNECT", [
                      meter.meterId,
                    ])
                  }
                >
                  {meter.status === "Online" ? (
                    <RefreshCw size={14} />
                  ) : (
                    <Plug size={14} />
                  )}
                  {meter.status === "Online" ? "Read" : "Connect"}
                </Button>
                <Button
                  className="icon-btn ghost"
                  onClick={() => {
                    const n = new Set(expanded)
                    n.has(meter.meterId)
                      ? n.delete(meter.meterId)
                      : n.add(meter.meterId)
                    setExpanded(n)
                  }}
                >
                  <ChevronDown size={15} />
                </Button>
              </div>
            </article>
          ))}
      </div>
    </main>
  )
}

function ExcelView({
  meters,
  selected,
  download,
  onImport,
  notify,
}: {
  meters: Meter[]
  selected: Set<number>
  download: (meters: Meter[]) => void
  onImport: (meters: Meter[]) => void
  notify: (message: string) => void
}) {
  const [status, setStatus] = useState("All")
  const [query, setQuery] = useState("")
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 25
  const filtered = meters
    .filter(
      (m) =>
        (status === "All" || m.status === status) &&
        `${m.meterId} ${m.serialNumber} ${m.meterType}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => (a.meterId - b.meterId) * (sortAsc ? 1 : -1))
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize)
  const importFile = async (file?: File) => {
    if (!file) return
    try {
      const book = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        book.Sheets[book.SheetNames[0]],
      )
      const valid = rows.filter(
        (row) =>
          Number.isInteger(Number(row["Meter ID"])) &&
          String(row["Meter Type"] ?? "") === "LNT_THREE",
      )
      if (!valid.length) {
        notify(
          "Import failed: expected Meter ID and Meter Type (LNT_THREE) columns.",
        )
        return
      }
      const imported = valid.map((row) => {
        const base = generateMeters(1)[0]
        return {
          ...base,
          meterId: Number(row["Meter ID"]),
          meterType: "LNT_THREE",
          serialNumber: String(
            row["Serial Number"] ?? `IMPORTED-${row["Meter ID"]}`,
          ),
          status: "Offline" as const,
          gridLoad: null,
          dgLoad: null,
          totalPower: null,
          powerFactor: null,
          frequency: null,
          currentSource: null,
          gridReading: null,
          dgReading: null,
          powerKVA: null,
          phases: {
            R: { voltage: null, current: null, kw: null, pf: null },
            Y: { voltage: null, current: null, kw: null, pf: null },
            B: { voltage: null, current: null, kw: null, pf: null },
          },
          isMockData: true,
        }
      })
      onImport(imported)
      notify(`${imported.length} meter(s) imported as TEST / MOCK DATA.`)
    } catch {
      notify("Import failed: the file is not a valid Excel workbook.")
    }
  }
  return (
    <main className="page-content">
      <section className="card excel-toolbar">
        <div>
          <Heading level={2}>Excel data view</Heading>
          <p>Search, sort, import, and export TEST / MOCK meter records.</p>
        </div>
        <div>
          <Input
            className="file-input"
            type="file"
            accept=".xlsx,.xls"
            aria-label="Import Excel"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
          <Button className="btn-secondary" onClick={() => download(meters)}>
            <Download size={15} />
            Download all
          </Button>
          <Button
            className="btn-secondary"
            disabled={!selected.size}
            onClick={() =>
              download(meters.filter((m) => selected.has(m.meterId)))
            }
          >
            <Download size={15} />
            Selected
          </Button>
          <Button className="btn-primary" onClick={() => download(filtered)}>
            <Sheet size={15} />
            Download filtered
          </Button>
        </div>
      </section>
      <section className="card">
        <div className="filter-bar">
          <div className="search-wrap">
            <Search size={16} />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search meter or serial"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="All">All statuses</option>
            <option>Online</option>
            <option>Offline</option>
            <option>Error</option>
          </Select>
          <Button
            className="btn-secondary"
            onClick={() => setSortAsc(!sortAsc)}
          >
            Meter ID {sortAsc ? "↑" : "↓"}
          </Button>
          <span className="result-count">{filtered.length} rows</span>
        </div>
        <div className="table-wrap excel-wrap">
          <table className="excel-table">
            <thead>
              <tr>
                {[
                  "Meter ID",
                  "Meter type",
                  "Serial",
                  "Status",
                  "Grid load",
                  "DG load",
                  "Total power",
                  "PF",
                  "Frequency",
                  "Source",
                  "Grid reading",
                  "DG reading",
                  "KVA",
                  "R Voltage",
                  "R Current",
                  "R kW",
                  "R PF",
                  "Y Voltage",
                  "Y Current",
                  "Y kW",
                  "Y PF",
                  "B Voltage",
                  "B Current",
                  "B kW",
                  "B PF",
                  "Last updated",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.meterId}>
                  {[
                    m.meterId,
                    m.meterType,
                    m.serialNumber,
                    m.status,
                    m.gridLoad,
                    m.dgLoad,
                    m.totalPower,
                    m.powerFactor,
                    m.frequency,
                    m.currentSource,
                    m.gridReading,
                    m.dgReading,
                    m.powerKVA,
                    m.phases.R.voltage,
                    m.phases.R.current,
                    m.phases.R.kw,
                    m.phases.R.pf,
                    m.phases.Y.voltage,
                    m.phases.Y.current,
                    m.phases.Y.kw,
                    m.phases.Y.pf,
                    m.phases.B.voltage,
                    m.phases.B.current,
                    m.phases.B.kw,
                    m.phases.B.pf,
                    shortTime(m.lastUpdated),
                  ].map((v, i) => (
                    <td key={i}>{v ?? "N/A"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>
            Page {page} of {pages}
          </span>
          <div>
            <Button
              className="icon-btn ghost"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={15} />
            </Button>
            <Button className="page-active">{page}</Button>
            <Button
              className="icon-btn ghost"
              disabled={page === pages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

function LogsPage({
  logs,
  onExported,
}: {
  logs: OperationLog[]
  onExported: () => void
}) {
  const [operation, setOperation] = useState("All")
  const shown = logs.filter(
    (l) => operation === "All" || l.operation === operation,
  )
  const exportLogs = () => {
    const rows = shown.map((log) => ({
      Time: new Date(log.time).toLocaleString(),
      Operation: log.operation,
      "Device Topic": log.deviceTopic,
      Endpoint: log.endpoint,
      "Meter ID": log.meterId,
      Status: log.status,
      "Response Time (ms)": log.responseTime,
      Details: log.details,
    }))
    const sheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        "Time",
        "Operation",
        "Device Topic",
        "Endpoint",
        "Meter ID",
        "Status",
        "Response Time (ms)",
        "Details",
      ],
    })
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "Operation Logs")
    XLSX.writeFile(
      book,
      `Operation_Logs_${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
    onExported()
  }
  return (
    <main className="page-content">
      <section className="card">
        <div className="section-head">
          <div>
            <Heading level={2}>Operation history</Heading>
            <p>Persistent audit trail for meter communications.</p>
          </div>
          <div className="inline-filters">
            <Select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
            >
              <option value="All">All operations</option>
              <option>READ</option>
              <option>CONNECT</option>
              <option>DISCONNECT</option>
              <option>SET_LOAD</option>
              <option>REMOVE</option>
            </Select>
            <Button className="btn-secondary" onClick={exportLogs}>
              <Download size={15} />
              Export logs
            </Button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Operation</th>
                <th>Device topic</th>
                <th>Endpoint</th>
                <th>Meter ID</th>
                <th>Status</th>
                <th>Response</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.time).toLocaleString()}</td>
                  <td>
                    <b>{log.operation}</b>
                  </td>
                  <td>{log.deviceTopic}</td>
                  <td>{log.endpoint}</td>
                  <td>#{log.meterId}</td>
                  <td>
                    <StatusBadge status={log.status} />
                  </td>
                  <td>{log.responseTime} ms</td>
                  <td>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function StaticPage({ page, latest }: { page: Page; latest: unknown }) {
  if (page === "Response Viewer")
    return (
      <main className="page-content">
        <div className="response-overview">
          <SummaryCard
            label="Response status"
            value={latest ? "Received" : "Waiting"}
            icon={Activity}
            tone="green"
          />
          <SummaryCard label="Connection" value="Connected" icon={Cable} />
          <SummaryCard
            label="Mode"
            value="Test / Mock"
            icon={Database}
            tone="orange"
          />
        </div>
        <JsonViewer
          value={
            latest ?? {
              status: "waiting",
              message: "No response received in this session.",
            }
          }
          title="Latest MQTT response"
        />
      </main>
    )
  return (
    <main className="page-content">
      <div className="card empty-page">
        <AlertTriangle size={30} />
        <Heading level={3}>Page unavailable</Heading>
        <p>This page is not configured.</p>
      </div>
    </main>
  )
}

function App() {
  const [page, setPage] = useState<Page>("Dashboard")
  const [meters, setMeters] = useState<Meter[]>(initialMeters)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [activeId, setActiveId] = useState<number | null>(null)
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [latest, setLatest] = useState<unknown>(null)
  const [sidebar, setSidebar] = useState(true)
  const [modal, setModal] = useState<"add" | "generate" | "remove" | null>(null)
  const [removeIds, setRemoveIds] = useState<number[]>([])
  const [busy, setBusy] = useState<{
    label: string
    done: number
    total: number
  } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [connected, setConnected] = useState(true)
  const [connectionBusy, setConnectionBusy] = useState(false)
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>(
    () =>
      JSON.parse(localStorage.getItem("saved-requests") ?? "null") ?? [
        {
          id: crypto.randomUUID(),
          name: "Daily fleet reading",
          operation: "READ",
          meterIds: [initialMeters[0].meterId],
          endpoint: initialMeters[0].endpoint,
          deviceTopic: initialMeters[0].deviceTopic,
          createdAt: new Date().toISOString(),
        },
      ],
  )
  const [endpoints, setEndpoints] = useState<EndpointConfig[]>(
    () =>
      JSON.parse(localStorage.getItem("mqtt-endpoints") ?? "null") ?? [
        {
          id: crypto.randomUUID(),
          name: "MQTT Broker",
          host: "broker.hivemq.com",
          port: 8883,
          protocol: "MQTT/TLS",
          status: "Untested",
        },
      ],
  )
  const [accessKeys, setAccessKeys] = useState<AccessKey[]>(
    () =>
      JSON.parse(localStorage.getItem("access-keys") ?? "null") ?? [
        {
          id: crypto.randomUUID(),
          name: "Development Test Key",
          value: crypto.randomUUID().replace(/-/g, ""),
          createdAt: new Date().toISOString(),
          status: "Active",
        },
      ],
  )
  const metersRef = useRef(meters)
  metersRef.current = meters
  const active =
    activeId === null ? undefined : meters.find((m) => m.meterId === activeId)
  const pageDescription: Record<Page, string> = {
    Dashboard: "Real-time fleet health and electrical load overview",
    "Request Builder": "Configure and publish MQTT messages",
    "Response Viewer": "Inspect raw and parsed broker responses",
    "Meter Monitor": "Live multi-meter monitoring",
    "Operation Logs": "Audit meter operations and responses",
    "Saved Requests": "Reusable operation configurations",
    Endpoints: "Broker and endpoint management",
    "Access Keys": "Secure credential management",
    Settings: "Workspace and MQTT preferences",
    "Excel View": "Spreadsheet-style meter data analysis",
    "Multi Meter View": "Compare meters side by side",
    "Meter Details": `Meter ${active?.meterId ?? ""} telemetry and diagnostics`,
    Profile: "Manage profile and account preferences",
    Read: "Read meter telemetry",
    Connect: "Connect a configured meter",
    Disconnect: "Disconnect an active meter",
    "Set Load": "Configure a simulated meter load",
    "Remove Meter": "Review and remove a meter",
    Complaints: "AI-assisted complaint triage",
    Visitors: "Visitor approvals and access history",
    "Predictive Maintenance": "Asset condition and maintenance risk",
    "Society Chatbot": "Authorized society guidance",
    Maintenance: "Service requests, schedules, and dues",
  }
  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }
  const addLog = (
    operation: Operation,
    meter: Meter,
    success = true,
    time = 277,
  ) =>
    setLogs((current) => [
      {
        id: crypto.randomUUID(),
        time: new Date().toISOString(),
        operation,
        deviceTopic: meter.deviceTopic,
        endpoint: meter.endpoint,
        meterId: meter.meterId,
        status: success ? "Success" : "Failed",
        responseTime: time,
        details: success
          ? `${operation.replace("_", " ")} completed`
          : "Operation failed",
      },
      ...current,
    ])

  const refreshTelemetry = async (showFeedback = true) => {
    if (showFeedback) setRefreshing(true)
    const online = metersRef.current.filter(
      (meter) => meter.status === "Online",
    )
    const updated = await Promise.all(
      online.map((meter) => mqttService.readMeter(meter)),
    )
    const byId = new Map(updated.map((meter) => [meter.meterId, meter]))
    setMeters((current) =>
      current.map((meter) => byId.get(meter.meterId) ?? meter),
    )
    if (showFeedback) {
      setRefreshing(false)
      notify(`${updated.length} online meters refreshed.`)
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshTelemetry(false)
    }, 12000)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => {
    localStorage.setItem("saved-requests", JSON.stringify(savedRequests))
  }, [savedRequests])
  useEffect(() => {
    localStorage.setItem("mqtt-endpoints", JSON.stringify(endpoints))
  }, [endpoints])
  useEffect(() => {
    localStorage.setItem("access-keys", JSON.stringify(accessKeys))
  }, [accessKeys])

  const runOperation = async (operation: Operation, ids: number[]) => {
    if (operation === "REMOVE") {
      setRemoveIds(ids)
      setModal("remove")
      return
    }
    if (!connected) {
      notify("Connect the mock MQTT session before running meter operations.")
      return
    }
    if (operation === "SET_LOAD") {
      const entered = window.prompt(
        "Enter total load in kW for the selected meter:",
        String(active?.totalPower ?? ""),
      )
      const load = entered === null ? NaN : Number(entered)
      if (!Number.isFinite(load) || load < 0) {
        if (entered !== null) notify("Invalid load value.")
        return
      }
      const meter = meters.find((m) => m.meterId === ids[0])
      if (!meter) return
      setBusy({ label: "SET LOAD in progress", done: 0, total: 1 })
      try {
        const result = await mqttService.setLoad(meter, load)
        setMeters((all) =>
          all.map((m) => (m.meterId === result.meterId ? result : m)),
        )
        addLog("SET_LOAD", meter)
        setLatest({
          operation,
          status: "success",
          mode: "TEST / MOCK DATA",
          meter: result,
        })
      } catch (error) {
        addLog("SET_LOAD", meter, false)
        setLatest({
          operation,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        })
        notify("Set load failed.")
      }
      setBusy({ label: "SET LOAD in progress", done: 1, total: 1 })
      window.setTimeout(() => setBusy(null), 600)
      notify("Meter load updated successfully.")
      return
    }
    setBusy({
      label: `${operation.replace("_", " ")} in progress`,
      done: 0,
      total: ids.length,
    })
    for (let i = 0; i < ids.length; i++) {
      const meter = meters.find((m) => m.meterId === ids[i])
      if (!meter) continue
      if (operation === "CONNECT")
        setMeters((all) =>
          all.map((m) =>
            m.meterId === meter.meterId ? { ...m, status: "Connecting" } : m,
          ),
        )
      try {
        const result =
          operation === "CONNECT"
            ? await mqttService.connectMeter(meter)
            : operation === "DISCONNECT"
              ? await mqttService.disconnectMeter(meter)
              : await mqttService.readMeter(meter)
        setMeters((all) =>
          all.map((m) => (m.meterId === result.meterId ? result : m)),
        )
        addLog(operation, meter)
        setLatest({
          operation,
          status: "success",
          mode: "TEST / MOCK DATA",
          meter: result,
        })
      } catch (error) {
        addLog(operation, meter, false)
        setLatest({
          operation,
          status: "failed",
          meterId: meter.meterId,
          error:
            error instanceof Error ? error.message : "Unknown operation error",
        })
      }
      setBusy({
        label: `${operation.replace("_", " ")} in progress`,
        done: i + 1,
        total: ids.length,
      })
    }
    window.setTimeout(() => setBusy(null), 600)
    notify(
      `${ids.length} meter${
        ids.length > 1 ? "s" : ""
      } ${operation.toLowerCase()} completed successfully.`,
    )
  }
  const toggleConnection = async () => {
    setConnectionBusy(true)
    try {
      const ok = connected
        ? await mqttService.disconnect()
        : await mqttService.connect()
      if (!ok) throw new Error("Service rejected the connection change.")
      setConnected(!connected)
      notify(
        `${
          connected ? "Disconnected from" : "Connected to"
        } the mock MQTT service.`,
      )
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Connection action failed.",
      )
    } finally {
      setConnectionBusy(false)
    }
  }
  const quick = (item: (typeof QUICK)[number]) => {
    if (item.page) {
      setPage(item.page)
      return
    }
    if (item.action === "ADD") setModal("add")
    else if (item.action === "GENERATE") setModal("generate")
    else if (item.action === "DOWNLOAD") download(meters)
    else if (item.action?.startsWith("ALL_")) {
      const op = item.action.replace("ALL_", "") as Operation | undefined
      if (op === "READ" || op === "CONNECT" || op === "DISCONNECT") {
        runOperation(op, meters.map((m) => m.meterId))
      }
    }
    else if (item.action) {
      const ids = selected.size ? [...selected] : active ? [active.meterId] : []
      if (!ids.length) {
        notify("Select a meter before running this action.")
        return
      }
      if (item.action === "READ" || item.action === "CONNECT" || item.action === "DISCONNECT" || item.action === "SET_LOAD" || item.action === "REMOVE") {
        runOperation(item.action, ids)
      }
    }
  }
  const view = (meter: Meter) => {
    setActiveId(meter.meterId)
    setPage("Meter Details")
  }
  const download = (rows: Meter[]) => {
    const flat = rows.map((m) => ({
      "Meter ID": m.meterId,
      "Meter Type": m.meterType,
      "Serial Number": m.serialNumber,
      Status: m.status,
      "Grid Load (kW)": m.gridLoad ?? "N/A",
      "DG Load (kW)": m.dgLoad ?? "N/A",
      "Total Power (kW)": m.totalPower ?? "N/A",
      "Power Factor": m.powerFactor ?? "N/A",
      "Frequency (Hz)": m.frequency ?? "N/A",
      Source: m.currentSource ?? "N/A",
      "Grid Reading": m.gridReading ?? "N/A",
      "DG Reading": m.dgReading ?? "N/A",
      "Power (KVA)": m.powerKVA ?? "N/A",
      "R Voltage": m.phases.R.voltage ?? "N/A",
      "R Current": m.phases.R.current ?? "N/A",
      "R kW": m.phases.R.kw ?? "N/A",
      "R PF": m.phases.R.pf ?? "N/A",
      "Y Voltage": m.phases.Y.voltage ?? "N/A",
      "Y Current": m.phases.Y.current ?? "N/A",
      "Y kW": m.phases.Y.kw ?? "N/A",
      "Y PF": m.phases.Y.pf ?? "N/A",
      "B Voltage": m.phases.B.voltage ?? "N/A",
      "B Current": m.phases.B.current ?? "N/A",
      "B kW": m.phases.B.kw ?? "N/A",
      "B PF": m.phases.B.pf ?? "N/A",
      "Last Updated": m.lastUpdated,
      "Data Source": m.isMockData ? "TEST / MOCK DATA" : "LIVE",
    }))
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(flat),
      "Meter Data",
    )
    XLSX.writeFile(
      book,
      `Meter_Data_${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
    notify("Excel downloaded successfully.")
  }

  const currentContent = useMemo(() => {
    if (page === "Dashboard")
      return (
        <Dashboard
          meters={meters}
          selected={selected}
          setSelected={setSelected}
          active={active}
          setActive={(m) => setActiveId(m.meterId)}
          onAction={runOperation}
          onView={view}
          onRefresh={() => void refreshTelemetry()}
          refreshing={refreshing}
        />
      )
    if (page === "Meter Details" && active)
      return (
        <MeterDetails
          meter={active}
          onBack={() => setPage("Dashboard")}
          onAction={runOperation}
        />
      )
    if (page === "Meter Details")
      return (
        <Dashboard
          meters={meters}
          selected={selected}
          setSelected={setSelected}
          active={undefined}
          setActive={(m) => setActiveId(m.meterId)}
          onAction={runOperation}
          onView={view}
          onRefresh={() => void refreshTelemetry()}
          refreshing={refreshing}
        />
      )
    if (page === "Request Builder")
      return (
        <RequestBuilder
          meters={meters}
          active={active}
          onResponse={setLatest}
          notify={notify}
          onSave={(request) => {
            setSavedRequests((items) => [...items, request])
            notify("Request saved.")
          }}
        />
      )
    if (page === "Multi Meter View" || page === "Meter Monitor")
      return (
        <MultiMeter meters={meters} onView={view} onAction={runOperation} />
      )
    if (page === "Excel View")
      return (
        <ExcelView
          meters={meters}
          selected={selected}
          download={download}
          notify={notify}
          onImport={(imported) =>
            setMeters((current) => {
              const ids = new Set(imported.map((item) => item.meterId))
              return [
                ...current.filter((item) => !ids.has(item.meterId)),
                ...imported,
              ].sort((a, b) => a.meterId - b.meterId)
            })
          }
        />
      )
    if (page === "Operation Logs")
      return (
        <LogsPage
          logs={logs}
          onExported={() => notify("Operation logs exported successfully.")}
        />
      )
    if (page === "Saved Requests")
      return (
        <SavedRequestsPage
          requests={savedRequests}
          onRun={(request) => {
            const usable = request.meterIds.filter((id) =>
              meters.some((meter) => meter.meterId === id),
            )
            if (!usable.length) {
              notify("This request has no available meters.")
              return
            }
            void runOperation(request.operation, usable)
            setPage("Response Viewer")
          }}
          onCopy={(request) => {
            setSavedRequests((items) => [
              ...items,
              {
                ...request,
                id: crypto.randomUUID(),
                name: `${request.name} (copy)`,
                createdAt: new Date().toISOString(),
              },
            ])
            notify("Saved request duplicated.")
          }}
          onDelete={(request) => {
            if (window.confirm(`Delete saved request "${request.name}"?`)) {
              setSavedRequests((items) =>
                items.filter((item) => item.id !== request.id),
              )
              notify("Saved request deleted.")
            }
          }}
        />
      )
    if (page === "Endpoints")
      return (
        <EndpointsPage
          endpoints={endpoints}
          onChange={setEndpoints}
          notify={notify}
        />
      )
    if (page === "Access Keys")
      return (
        <AccessKeysPage
          keys={accessKeys}
          onChange={setAccessKeys}
          notify={notify}
        />
      )
    if (page === "Settings") return <SettingsPage notify={notify} />
    if (page === "Profile") return <ProfilePage notify={notify} />
    if (
      page === "Read" ||
      page === "Connect" ||
      page === "Disconnect" ||
      page === "Set Load" ||
      page === "Remove Meter"
    )
      return (
        <OperationPage
          page={page}
          meters={meters}
          connected={connected}
          busy={Boolean(busy)}
          onRun={async (operation, meterId, load) => {
            if (operation === "SET_LOAD" && load !== undefined) {
              const meter = meters.find((item) => item.meterId === meterId)
              if (!meter) return
              setBusy({ label: "SET LOAD in progress", done: 0, total: 1 })
              try {
                const result = await mqttService.setLoad(meter, load)
                setMeters((items) =>
                  items.map((item) =>
                    item.meterId === meterId ? result : item,
                  ),
                )
                addLog(operation, meter)
                setLatest({
                  operation,
                  status: "success",
                  mode: "TEST / MOCK DATA",
                  meter: result,
                })
                notify("Simulated load updated.")
              } finally {
                setBusy(null)
              }
              return
            }
            await runOperation(operation, [meterId])
          }}
        />
      )
    if (
      page === "Complaints" ||
      page === "Visitors" ||
      page === "Predictive Maintenance" ||
      page === "Society Chatbot" ||
      page === "Maintenance"
    )
      return <SocietyPage page={page} notify={notify} />
    return <StaticPage page={page} latest={latest} />
  }, [
    page,
    meters,
    selected,
    active,
    logs,
    latest,
    refreshing,
    savedRequests,
    endpoints,
    accessKeys,
    connected,
    busy,
  ])

  return (
    <div className={`app-shell ${sidebar ? "" : "sidebar-collapsed"}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={21} />
          </div>
          <div>
            <strong>MQTT Utility</strong>
            <span>Meter Operations</span>
          </div>
          <Button
            className="icon-btn side-toggle"
            onClick={() => setSidebar(!sidebar)}
          >
            <PanelLeftClose size={17} />
          </Button>
        </div>
        <nav className="main-nav">
          <span className="nav-label">WORKSPACE</span>
          {NAV.map((item) => (
            <Button
              key={item.name}
              className={page === item.name ? "active" : ""}
              onClick={() => setPage(item.name)}
              title={item.name}
            >
              <item.icon size={17} />
              <span>{item.name}</span>
              {item.name === "Operation Logs" && logs.length > 0 && (
                <b>{logs.length}</b>
              )}
            </Button>
          ))}
        </nav>
        <div className="quick-nav">
          <span className="nav-label">QUICK ACTIONS</span>
          <div>
            {QUICK.map((item) => (
              <Button
                key={item.label}
                onClick={() => quick(item)}
                title={item.label}
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </Button>
            ))}
          </div>
        </div>
        <div className="mode-card">
          <Database size={16} />
          <div>
            <strong>Test Mode</strong>
            <span>Mock MQTT active</span>
          </div>
          <span className="mode-pulse" />
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="title-area">
            <Button
              className="icon-btn mobile-menu"
              onClick={() => setSidebar(!sidebar)}
            >
              <Menu />
            </Button>
            <div>
              <Heading level={1}>{page}</Heading>
              <p>{pageDescription[page]}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="broker-status">
              <span className={connected ? "live-dot" : "offline-dot"} />
              <div>
                <strong>
                  {connected ? "Test service connected" : "Disconnected"}
                </strong>
                <span>Mock MQTT abstraction</span>
              </div>
            </div>
            <Button
              className="btn-secondary disconnect-head"
              disabled={connectionBusy}
              onClick={() => void toggleConnection()}
            >
              {connectionBusy ? (
                <LoaderCircle className="spin" size={14} />
              ) : connected ? (
                <Unplug size={14} />
              ) : (
                <Plug size={14} />
              )}
              {connectionBusy
                ? "Working..."
                : connected
                  ? "Disconnect"
                  : "Connect"}
            </Button>
            <Button
              className="icon-btn ghost"
              onClick={() => setPage("Settings")}
            >
              <Settings size={18} />
            </Button>
            <Button className="avatar" onClick={() => setPage("Profile")}>
              <UserRound size={17} />
            </Button>
          </div>
        </header>
        <div className="test-strip">
          <AlertTriangle size={14} />
          <strong>TEST / MOCK DATA MODE</strong>
          <span>
            Displayed readings are simulated and must not be treated as
            production telemetry.
          </span>
        </div>
        {currentContent}
      </div>
      <Button className="mobile-fab" onClick={() => setSidebar(true)}>
        <Menu size={20} />
      </Button>
      {busy && (
        <div className="progress-toast">
          <div>
            <LoaderCircle className="spin" size={18} />
            <strong>{busy.label}</strong>
            <span>
              {busy.done} / {busy.total} completed
            </span>
          </div>
          <div className="progress-track">
            <span
              style={{
                width: `${busy.total ? (busy.done / busy.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}
      {toast && (
        <div className="toast-success">
          <Check size={17} />
          {toast}
        </div>
      )}
      {modal === "remove" && (
        <Modal title="Remove meter" onClose={() => setModal(null)}>
          <div className="confirm-body">
            <div className="confirm-icon">
              <AlertTriangle />
            </div>
            <p>
              Are you sure you want to remove{" "}
              {removeIds.length === 1
                ? `Meter ID ${removeIds[0]}`
                : `${removeIds.length} selected meters`}
              ? Historical operation logs will be preserved.
            </p>
          </div>
          <div className="modal-actions">
            <Button className="btn-secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              className="btn-danger"
              onClick={() => {
                removeIds.forEach((id) => {
                  const m = meters.find((x) => x.meterId === id)
                  if (m) addLog("REMOVE", m)
                })
                setMeters((all) =>
                  all.filter((m) => !removeIds.includes(m.meterId)),
                )
                setSelected(new Set())
                setModal(null)
                notify("Meter removed successfully.")
              }}
            >
              <Trash2 size={15} />
              Remove
            </Button>
          </div>
        </Modal>
      )}
      {modal === "add" && (
        <AddMeterModal
          meters={meters}
          onClose={() => setModal(null)}
          onAdd={(meter) => {
            setMeters((m) => [...m, meter])
            setModal(null)
            notify("Meter added successfully.")
          }}
        />
      )}
      {modal === "generate" && (
        <GenerateModal
          onClose={() => setModal(null)}
          onGenerate={(count) => {
            setMeters(generateMeters(count))
            setSelected(new Set())
            setActiveId(null)
            setModal(null)
            notify(`${count} test meters generated.`)
          }}
        />
      )}
    </div>
  )
}

function AddMeterModal({
  meters,
  onClose,
  onAdd,
}: {
  meters: Meter[]
  onClose: () => void
  onAdd: (m: Meter) => void
}) {
  const [id, setId] = useState(Math.max(...meters.map((m) => m.meterId)) + 1)
  const [serial, setSerial] = useState("")
  const duplicate = meters.some((m) => m.meterId === id)
  return (
    <Modal title="Add meter" onClose={onClose} size="modal-wide">
      <div className="modal-form">
        <label>
          Meter ID
          <Input
            type="number"
            value={id}
            onChange={(e) => setId(Number(e.target.value))}
          />
          {duplicate && (
            <small className="error-text">Meter ID must be unique.</small>
          )}
        </label>
        <label>
          Meter type
          <Select>
            <option>LNT_THREE</option>
          </Select>
        </label>
        <label>
          Serial number
          <Input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Enter serial number"
          />
        </label>
        <label>
          Connection status
          <Select disabled>
            <option>Offline</option>
          </Select>
        </label>
        <label>
          Device topic
          <Input defaultValue={`device/meter-${id}`} />
        </label>
        <label>
          Response topic
          <Input defaultValue={`device/meter-${id}/response`} />
        </label>
        <label>
          Endpoint
          <Input defaultValue="235.24.54.22:3" />
        </label>
        <label>
          Access key
          <Select>
            <option>Production key ·••295</option>
          </Select>
        </label>
      </div>
      <div className="modal-actions">
        <Button className="btn-secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="btn-primary"
          disabled={duplicate || !serial}
          onClick={() =>
            onAdd({
              ...generateMeters(1)[0],
              meterId: id,
              serialNumber: serial,
              status: "Offline",
              gridLoad: null,
              dgLoad: null,
              totalPower: null,
              powerFactor: null,
              frequency: null,
              currentSource: null,
              gridReading: null,
              dgReading: null,
              powerKVA: null,
              phases: {
                R: { voltage: null, current: null, kw: null, pf: null },
                Y: { voltage: null, current: null, kw: null, pf: null },
                B: { voltage: null, current: null, kw: null, pf: null },
              },
              deviceTopic: `device/meter-${id}`,
              responseTopic: `device/meter-${id}/response`,
            })
          }
        >
          <Plus size={15} />
          Add meter
        </Button>
      </div>
    </Modal>
  )
}

function GenerateModal({
  onClose,
  onGenerate,
}: {
  onClose: () => void
  onGenerate: (n: number) => void
}) {
  const [count, setCount] = useState(10)
  return (
    <Modal title="Generate test data" onClose={onClose}>
      <div className="mock-notice">
        <Database size={20} />
        <div>
          <strong>Test / Mock Data</strong>
          <p>
            Generated readings are simulated, uniquely varied, and clearly
            labeled throughout the application.
          </p>
        </div>
      </div>
      <div className="modal-form single">
        <label>
          Number of meters (10–200)
          <Input
            type="number"
            min={10}
            max={200}
            value={count}
            onChange={(e) =>
              setCount(Math.min(200, Math.max(10, Number(e.target.value))))
            }
          />
        </label>
        <label>
          Meter type
          <Select>
            <option>LNT_THREE</option>
          </Select>
        </label>
      </div>
      <div className="modal-actions">
        <Button className="btn-secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button className="btn-primary" onClick={() => onGenerate(count)}>
          <Database size={15} />
          Generate test data
        </Button>
      </div>
    </Modal>
  )
}

export default App
