type MetaValue = string | number | boolean | MetaObject | MetaValue[];

interface MetaObject {
  [key: string]: MetaValue;
}

const keyValRegex = /^\s*([^\s\[\{:]+)\s*:\s*(.*)$/;
const quotedKeyRegex = /^\s*(\"([^"]+)\"|\'([^']+)\')\s*:\s*(.*)/;
const commentRegex = /^\s*#/;

/**
 * Parses a YAML-like string (custom FrontMatter-string) into a structured JSON object.
 *
 * Supports: key-value pairs, indentation-based nesting, lists (-/+),
 * inline arrays [], inline objects {}, and block scalars (| and >).
 *
 * @param metaString The raw string to be parsed.
 * @returns A structured JSON object represented by MetaObject.
 */
export function parseSimplifiedYAML(metaString: string): MetaObject {
  if (!metaString || typeof metaString !== "string") return {};

  const allLines = metaString.split(/\r|\n|\r\n/g);
  const parsedData = processLines(allLines);

  // If the parser returns a primitive or array at the root, return empty object
  // as this function is expected to return a Map/Record.
  if (typeof parsedData !== "object" || Array.isArray(parsedData) || parsedData === null) {
    return {};
  }

  // Clean up internal state key
  delete parsedData[""];
  return parsedData as MetaObject;
}

/**
 * Core recursive parser to handle structure and nesting.
 */
function processLines(lines: string[]): any {
  let currentKey = "";
  const resultObj: Record<string, any> = {};
  let insideQuoteMode: string | boolean = false; // Tracks if we are inside a multi-line quote

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Ignore comments
    if (commentRegex.test(line)) continue;

    let match: RegExpExecArray | null;

    // 1. Handle Indented Blocks (Children objects or Logic Scalars)
    if (!insideQuoteMode && (match = /^\s+/.exec(line))) {
      const indent = match[0];
      let blockSymbol = "";
      const prevRawValue = resultObj[currentKey] || "";

      // Check for Literal (|) or Folded (>) block markers
      const symbolMatch = /^\s*([\|\>])\s*$/.exec(prevRawValue);
      if (symbolMatch) {
        blockSymbol = symbolMatch[1];
      }

      const [blockLines, nextIndex] = collectIndentedBlock(lines, i, indent);
      i = nextIndex - 1;

      if (blockSymbol === "|") {
        resultObj[currentKey] = blockLines.join("\n");
      } else if (blockSymbol === ">") {
        resultObj[currentKey] = blockLines
          .map((l) => (l.trim() ? l.trim() + " " : "\n"))
          .join("")
          .trim();
      } else {
        resultObj[currentKey] = processLines(blockLines);
      }
    }
    // 2. Handle List items (- item)
    else if ((match = /^[-+]\s/.exec(line))) {
      insideQuoteMode = false;
      const listIndent = match[0].replace(/^[-+]/, " ");
      const [listBlock, nextIndex] = collectIndentedBlock(lines, i + 1, listIndent);
      i = nextIndex - 1;

      resultObj[currentKey] = resultObj[currentKey] || [];
      if (Array.isArray(resultObj[currentKey])) {
        resultObj[currentKey].push(
          processLines([line.substring(listIndent.length), ...listBlock])
        );
      }
    }
    // 3. Handle Quoted Keys ("key": val)
    else if ((match = quotedKeyRegex.exec(line))) {
      insideQuoteMode = false;
      currentKey = match[2] || match[3] || "";
      resultObj[currentKey] = match[4].trim();

      const quoteStart = /^["']/.exec(resultObj[currentKey]);
      if (quoteStart && resultObj[currentKey][resultObj[currentKey].length - 1] !== quoteStart[0]) {
        insideQuoteMode = quoteStart[0];
      }
    }
    // 4. Handle Standard Keys (key: val)
    else if ((match = keyValRegex.exec(line))) {
      insideQuoteMode = false;
      currentKey = match[1];
      resultObj[currentKey] = match[2].trim();

      const quoteStart = /^["']/.exec(resultObj[currentKey]);
      if (quoteStart && resultObj[currentKey][resultObj[currentKey].length - 1] !== quoteStart[0]) {
        insideQuoteMode = quoteStart[0];
      }
    }
    // 5. Handle Text Appending (Multi-line values or state-less lines)
    else {
      currentKey = currentKey || "";
      const trimmedLine = line.trim();
      if (resultObj[currentKey]) {
        resultObj[currentKey] += "\n" + trimmedLine;
      } else {
        resultObj[currentKey] = trimmedLine;
      }

      if (typeof insideQuoteMode === "string" && trimmedLine[trimmedLine.length - 1] === insideQuoteMode) {
        insideQuoteMode = false;
      }
    }
  }

  // Conversion: If the object only contains an empty-string key, return its value
  const keys = Object.keys(resultObj);
  if (keys.length === 1 && resultObj[""] !== undefined) {
    return resultObj[""];
  }

  // Final Pass: Convert strings to types (objects, arrays, trimmed strings)
  keys.forEach((k) => {
    if (typeof resultObj[k] === "string") {
      resultObj[k] = parseValue(resultObj[k]);
    }
  });

  return resultObj;
}

/**
 * Gathers consecutive lines that share a specific indentation prefix.
 */
function collectIndentedBlock(
  lines: string[],
  startIndex: number,
  prefix: string
): [string[], number] {
  const block: string[] = [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    // Stop if the line doesn't start with the required indentation (unless it's empty)
    if (line.indexOf(prefix) !== 0 && line.trim().length !== 0) break;
    block.push(line.substring(prefix.length));
    i++;
  }
  return [block, i];
}

/**
 * Secondary parser for values to handle inline types and unquoting.
 */
function parseValue(val: string): MetaValue {
  let match: RegExpMatchArray | null;

  // 1. Parse inline arrays [item1, item2]
  if ((match = val.match(/^\s*\[(.*)\]\s*$/))) {
    return match[1].split(/\s*,\s*/).map(parseValue);
  }

  // 2. Parse inline objects {key: val}
  if ((match = val.match(/^\s*\{(.*)\}\s*$/))) {
    const obj: Record<string, string> = {};
    match[1].split(/\s*,\s*/).forEach((item) => {
      const parts = item.split(/\s*:\s*/);
      if (parts.length === 2) obj[parts[0]] = parts[1];
    });
    if (Object.keys(obj).length) return obj;
  }

  // 3. Process double-quoted strings (handle escaped newlines and spacing)
  if (/^"/.exec(val)) {
    return val
      .replace(/^"/, "")
      .replace(/"$/, "")
      .replace(/\n\n/g, "\n")
      .replace(/\\\n/g, "")
      .replace(/\n/g, " ")
      .replace(/\\n/g, "\n");
  }

  // 4. Process single-quoted strings (handle escaped single quotes)
  if (/^'/.exec(val)) {
    return val
      .replace(/^'/, "")
      .replace(/'$/, "")
      .replace(/\n\n/g, "\n")
      .replace(/''/g, "'")
      .replace(/\n/g, " ");
  }

  return val.trim();
}
