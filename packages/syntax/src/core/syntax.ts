import { languages } from "@pane-system/upstream/editor";
import { PATTERN } from "./patterns";
const keywords = [
  "abstract",
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "of",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "yield",
  "def",
  "elif",
  "except",
  "False",
  "None",
  "True",
  "and",
  "or",
  "not",
  "lambda",
  "with",
  "pass",
];
const identifiers = [
  "typescript",
  "javascript",
  "json",
  "css",
  "html",
  "markdown",
  "python",
  "shell",
  "yaml",
];
export function registerSyntax() {
  const handles: { dispose(): void }[] = [];
  for (const id of identifiers) {
    languages.register({ id });
    handles.push(
      languages.setMonarchTokensProvider(id, {
        keywords,
        tokenizer: {
          root: [
            [PATTERN.COMMENT, "comment"],
            [PATTERN.HASH_COMMENT, "comment"],
            [PATTERN.BLOCK_START, "comment", "@comment"],
            [PATTERN.STRING, "string"],
            [PATTERN.NUMBER, "number"],
            [
              PATTERN.IDENTIFIER,
              { cases: { "@keywords": "keyword", "@default": "identifier" } },
            ],
            [PATTERN.BRACKET, "delimiter.bracket"],
            [PATTERN.OPERATOR, "operator"],
            [PATTERN.SPACE, "white"],
          ],
          comment: [
            [PATTERN.BLOCK_END, "comment", "@pop"],
            [PATTERN.BLOCK_TEXT, "comment"],
            [PATTERN.BLOCK_STAR, "comment"],
          ],
        },
      }),
    );
  }
  return {
    dispose() {
      handles.forEach((handle) => handle.dispose());
    },
  };
}
