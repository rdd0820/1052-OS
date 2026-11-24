// 服务端保存的笔记目录配置。
export type NotesConfig = {
  /** 笔记根目录的绝对路径。 */
  rootPath: string
}

// 返回给客户端的笔记目录配置及其状态。
export type PublicNotesConfig = NotesConfig & {
  /** 当前是否已配置一个存在的笔记目录。 */
  configured: boolean
  /** 配置的笔记目录是否存在。 */
  exists: boolean
  /** 应用默认笔记目录的绝对路径。 */
  defaultRootPath: string
}

// 更新笔记目录配置的请求参数；具体类型由服务层校验。
export type NotesConfigInput = {
  /** 要设置的笔记根目录路径。 */
  rootPath?: unknown
}

// 笔记目录树中的文件或文件夹节点。
export type NoteTreeNode = {
  /** 文件或文件夹名称。 */
  name: string
  /** 相对于笔记根目录的路径，使用正斜杠分隔。 */
  relativePath: string
  /** 节点类型：Markdown 文件或文件夹。 */
  type: 'file' | 'dir'
  /** 文件大小（字节）；文件夹为 0。 */
  size: number
  /** 最近更新时间的 Unix 时间戳（毫秒）。 */
  updatedAt: number
  /** 文件夹的子节点；文件节点不包含此字段。 */
  children?: NoteTreeNode[]
}

// 返回给客户端的 Markdown 笔记文件。
export type NoteFile = {
  /** 相对于笔记根目录的文件路径。 */
  path: string
  /** 笔记文件名。 */
  name: string
  /** Markdown 正文。 */
  content: string
  /** 文件大小（字节）。 */
  size: number
  /** 最近更新时间的 Unix 时间戳（毫秒）。 */
  updatedAt: number
}

// 创建或更新笔记文件时使用的请求参数；字段类型由服务层校验。
export type NoteFileInput = {
  /** 相对于笔记根目录的文件夹路径；空值表示根目录。 */
  path?: unknown
  /** 创建时使用的文件名；不带扩展名时会补充 .md。 */
  name?: unknown
  /** Markdown 正文；未提供时按空字符串处理。 */
  content?: unknown
}

// 创建笔记文件夹时使用的请求参数。
export type NoteFolderInput = {
  /** 相对于笔记根目录的父文件夹路径；空值表示根目录。 */
  path?: unknown
  /** 要创建的文件夹名称。 */
  name?: unknown
}

// 移动笔记文件或文件夹时使用的请求参数。
export type NoteMoveInput = {
  /** 要移动的文件或文件夹相对路径。 */
  path?: unknown
  /** 目标文件夹相对路径；空值表示笔记根目录。 */
  targetDir?: unknown
}
