export interface SearchQuery {
  query: string;
  matchCase?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
  include?: string;
  exclude?: string;
}
export interface SearchMatch {
  path: string;
  line: number;
  column: number;
  endColumn: number;
  before: string;
  text: string;
  after: string;
}
export interface SearchResults {
  matches: SearchMatch[];
  fileCount: number;
  limitHit: boolean;
}
