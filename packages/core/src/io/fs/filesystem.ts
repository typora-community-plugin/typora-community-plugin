import { File } from "typora"
import type { FileAdapter } from "./file-adapter"
import { MacFS } from "./fs.darwin"
import { NodeFS } from "./fs.node"

const filesystem: FileAdapter = File.isNode ? new NodeFS() : new MacFS()

export default filesystem
