/**
 * 运行日志落盘。
 *
 * 两条来源，各写一个 JSONL 文件（一行一个 JSON）：
 * - 后端：`installBackendRuntimeLogging()` 包住 console，并接住未处理异常；`appendBackendRuntimeLog()` 也可被业务代码直接调用。
 * - 前端：`POST /api/logs/frontend` 把浏览器上报交给 `appendFrontendRuntimeLogs()`。
 *
 * 文件在 `config.dataDir/logs/` 下。默认就是仓库根目录的 `data/logs/`。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import util from 'node:util'
import { config } from './config.js'

/** 与 console 的四个方法对齐，方便挂钩时一一对应。 */
type RuntimeLogLevel = 'log' | 'info' | 'warn' | 'error'

/**
 * 写入前端日志文件的一条记录。
 * 只保留这些字段；请求体里多出来的字段（例如错误边界带上的 `stack`）会被丢掉。
 */
type FrontendRuntimeLogEntry = {
  /** 事件发生时间，毫秒时间戳。调用方没给合法数字时用服务器收到的时间。 */
  ts: number
  /** 非法或缺省时记成 `info`。 */
  level: RuntimeLogLevel
  /** 上报来源。缺省时记成 `frontend`。 */
  source: string
  /** 必填。空字符串的条目会被整条丢弃。 */
  message: string
  /** 发生时所在的页面地址。 */
  href?: string
  userAgent?: string
  /** 前端自己生成的会话标识，用来把同一次打开里的多条日志串起来。 */
  sessionId?: string
  /** 已经过 `serializeForLog` 的附加数据，保证能被 JSON.stringify。 */
  context?: unknown
}

const LOG_DIR = path.join(config.dataDir, 'logs')
const BACKEND_LOG_FILE = path.join(LOG_DIR, 'backend-runtime.jsonl')
const FRONTEND_LOG_FILE = path.join(LOG_DIR, 'frontend-runtime.jsonl')

/**
 * 每个日志文件一条写入链。同一文件的 append 必须串行，否则并发写入会互相截断。
 * 值是「上一笔写完」的 Promise，下一笔挂在它后面。
 */
const writeQueues = new Map<string, Promise<void>>()

/**
 * 挂钩之前的原始 console。
 * 必须在替换 `console.*` 之前 bind 下来，否则挂钩函数再调用 console 会递归进自己。
 */
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

/** 防止 `installBackendRuntimeLogging()` 被调用两次，重复包一层会导致每条日志写两遍。 */
let loggingInstalled = false

/** 超长文本截断后再落盘，避免一条日志把文件撑得太大。默认 8000 字符。 */
function truncateText(value: string, max = 8000) {
  return value.length > max ? `${value.slice(0, max)}...` : value
}

/**
 * 把任意值收成 JSON 能直接序列化的结构，给日志里的 `context` 用。
 *
 * 不能直接 `JSON.stringify`：`Error` 会变成 `{}`，`bigint` 会抛错，循环引用也会抛错。
 * 这里按类型改写成普通数据，并限制体积：
 * - 字符串截断
 * - 数组最多展开 3 层、每层最多 50 项，再深写成 `[Array(n)]`
 * - 普通对象最多保留 50 个可枚举自有属性；正在遍历的对象再次出现时写成 `[Circular]`
 * - `Date`、`Map`、`Set` 没有可枚举属性，结果会是空对象
 */
function serializeForLog(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return typeof value === 'string' ? truncateText(value) : value
  }

  if (value === undefined) return undefined
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`

  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateText(value.message, 4000),
      stack: value.stack ? truncateText(value.stack, 12000) : undefined,
    }
  }

  if (Array.isArray(value)) {
    if (depth >= 3) return `[Array(${value.length})]`
    return value.slice(0, 50).map((item) => serializeForLog(item, depth + 1, seen))
  }

  if (typeof value === 'object') {
    if (seen.has(value as object)) return '[Circular]'
    seen.add(value as object)
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 50)
    const normalized = Object.fromEntries(
      entries.map(([key, item]) => [key, serializeForLog(item, depth + 1, seen)]),
    )
    // 兄弟分支里再次遇到同一个对象不算循环，所以离开当前节点后从集合里拿掉。
    seen.delete(value as object)
    return normalized
  }

  // symbol 之类剩下的类型，退回到 Node 的文本表示。
  return truncateText(util.inspect(value, { depth: 3, breakLength: 120, maxArrayLength: 50 }))
}

/**
 * 把一次 `console.*` 调用的参数收成一条消息字符串。
 *
 * 字符串原样保留，避免 `util.inspect` 再给它加上引号。
 * 对象、错误、数组等走 `util.inspect`：最多展开 4 层，一行大约超过 120 字符就换行，数组只印前 50 项。
 * 多个参数用空格拼起来，和终端里 console 的观感一致；整段最后截到 8000 字符。
 *
 * 例：`console.error('请求失败', { status: 500 })`
 * 得到 `"请求失败 { status: 500 }"`。
 */
function formatConsoleArgs(args: unknown[]) {
  return truncateText(
    args
      .map((item) =>
        typeof item === 'string'
          ? item
          : util.inspect(item, { depth: 4, breakLength: 120, maxArrayLength: 50 }),
      )
      .join(' '),
  )
}

/**
 * 把若干行追加到同一个文件。
 *
 * 新的写入挂在该文件上一笔 Promise 后面，所以并发调用也会按调用顺序落盘。
 * 上一笔失败会被吞掉，不挡住后面的日志。
 * 写完后只有自己仍是队尾时才删掉队列项；后面又排了新任务时不能删，否则会拆断那条链。
 */
async function appendLines(filePath: string, lines: string[]) {
  const queued = writeQueues.get(filePath) ?? Promise.resolve()
  const task = queued.catch(() => {}).then(async () => {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.appendFile(filePath, lines.join(''), 'utf-8')
  })

  writeQueues.set(filePath, task)
  try {
    await task
  } finally {
    if (writeQueues.get(filePath) === task) writeQueues.delete(filePath)
  }
}

/** JSONL 的一行：一个 JSON 值加换行。`undefined` 字段会被 JSON.stringify 省略。 */
function toJsonLine(value: unknown) {
  return `${JSON.stringify(value)}\n`
}

/**
 * 追加一条后端运行日志到 `backend-runtime.jsonl`。
 * `context` 会先收成可序列化结构。HTTP 未处理异常和 console 挂钩都走这里。
 */
export async function appendBackendRuntimeLog(
  level: RuntimeLogLevel,
  message: string,
  context?: unknown,
) {
  await appendLines(BACKEND_LOG_FILE, [
    toJsonLine({
      ts: Date.now(),
      level,
      source: 'backend',
      pid: process.pid,
      message: truncateText(message),
      context: serializeForLog(context),
    }),
  ])
}

/**
 * 把前端上报的未知 JSON 收成一条日志。
 * 不是对象、或者没有非空 `message` 时返回 null，调用方会丢掉。
 * 级别不在四种之内时记为 `info`，避免坏数据写进文件后又无法按级别筛选。
 */
function normalizeFrontendRuntimeLogEntry(value: unknown): FrontendRuntimeLogEntry | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const level =
    record.level === 'log' ||
    record.level === 'info' ||
    record.level === 'warn' ||
    record.level === 'error'
      ? record.level
      : 'info'
  const message =
    typeof record.message === 'string' ? truncateText(record.message, 4000).trim() : ''
  if (!message) return null

  return {
    ts:
      typeof record.ts === 'number' && Number.isFinite(record.ts) ? record.ts : Date.now(),
    level,
    source:
      typeof record.source === 'string' && record.source.trim()
        ? truncateText(record.source, 120)
        : 'frontend',
    message,
    href:
      typeof record.href === 'string' && record.href.trim()
        ? truncateText(record.href, 1200)
        : undefined,
    userAgent:
      typeof record.userAgent === 'string' && record.userAgent.trim()
        ? truncateText(record.userAgent, 1200)
        : undefined,
    sessionId:
      typeof record.sessionId === 'string' && record.sessionId.trim()
        ? truncateText(record.sessionId, 120)
        : undefined,
    context: serializeForLog(record.context),
  }
}

/**
 * 接收前端上报并写入 `frontend-runtime.jsonl`。
 *
 * `input` 可以是下面三种形状，方便不同调用方：
 * - `{ logs: [...] }`：一批日志
 * - 数组：本身就是一批
 * - 单个对象：例如界面错误边界直接 POST `{ level, message }`
 *
 * 单次最多保留前 50 条；全部无效时什么都不写。
 */
export async function appendFrontendRuntimeLogs(input: unknown) {
  const raw =
    input && typeof input === 'object' && Array.isArray((input as { logs?: unknown[] }).logs)
      ? (input as { logs: unknown[] }).logs
      : Array.isArray(input)
        ? input
        : [input]

  const entries = raw
    .slice(0, 50)
    .map((item) => normalizeFrontendRuntimeLogEntry(item))
    .filter((item): item is FrontendRuntimeLogEntry => item !== null)

  if (entries.length === 0) return

  await appendLines(
    FRONTEND_LOG_FILE,
    entries.map((entry) => toJsonLine(entry)),
  )
}

/**
 * 在进程启动时安装一次（见 `index.ts`）。之后：
 * - `console.log/info/warn/error` 仍输出到终端，同时把参数收成一条后端日志
 * - `unhandledRejection` 和 `uncaughtException` 记为 error，原因放进 `context` 而不是拼进 message
 *
 * 写文件失败被吞掉，日志不能反过来弄垮请求处理。
 * console 挂钩的 `context` 只有 `{ source: 'console' }`，参数内容都在 `message` 里。
 */
export function installBackendRuntimeLogging() {
  if (loggingInstalled) return
  loggingInstalled = true

  const methods: RuntimeLogLevel[] = ['log', 'info', 'warn', 'error']
  for (const method of methods) {
    console[method] = (...args: unknown[]) => {
      originalConsole[method](...args)
      void appendBackendRuntimeLog(method, formatConsoleArgs(args), {
        source: 'console',
      }).catch(() => {})
    }
  }

  process.on('unhandledRejection', (reason) => {
    originalConsole.error('[unhandledRejection]', reason)
    void appendBackendRuntimeLog('error', '[unhandledRejection]', reason).catch(() => {})
  })

  process.on('uncaughtException', (error) => {
    originalConsole.error('[uncaughtException]', error)
    void appendBackendRuntimeLog('error', '[uncaughtException]', error).catch(() => {})
  })
}
