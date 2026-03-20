import { File } from "typora"
import type { FileAdapter } from "./file-adapter"
import { NodeFS } from "./fs.node"
import { MacFS } from "./fs.darwin"

const filesystem: FileAdapter = File.isNode ? new NodeFS() : new MacFS()

export default filesystem
