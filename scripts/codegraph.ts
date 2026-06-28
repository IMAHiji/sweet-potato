#!/usr/bin/env tsx
/**
 * Generates CODEGRAPH.md (Mermaid diagrams) and CODEGRAPH.json (machine-readable).
 * No additional dependencies — uses only Node built-ins + tsx.
 * Run: pnpm codegraph
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const rel = (p: string) => relative(ROOT, p).replace(/\\/g, '/');
const read = (p: string) => readFileSync(p, 'utf8');
const mid = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+/, '');

// ── File walking ──────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'public', 'data', '.claude']);

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, exts));
    else if (exts.includes(extname(name))) out.push(full);
  }
  return out;
}

// ── Module dependency extraction ──────────────────────────────────────────────

interface FileNode {
  path: string;
  imports: string[];
}

function buildDepGraph(files: string[]): FileNode[] {
  const fileSet = new Set(files.map(rel));
  return files.map((abs): FileNode => {
    const src = read(abs);
    const imports: string[] = [];
    const re = /from ['"](\.[^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const normalized = m[1].replace(/\.js$/, '.ts');
      const resolved = rel(resolve(dirname(abs), normalized));
      if (fileSet.has(resolved)) imports.push(resolved);
      else if (fileSet.has(resolved + '.ts')) imports.push(resolved + '.ts');
    }
    return { path: rel(abs), imports };
  });
}

// ── Route extraction ──────────────────────────────────────────────────────────

interface RouteInfo {
  method: string;
  path: string;
  auth: 'public' | 'user' | 'admin';
  file: string;
  view: string | null;
}

function extractRoutes(abs: string): RouteInfo[] {
  const src = read(abs);
  const file = rel(abs);
  const routes: RouteInfo[] = [];

  // File-level hook overrides per-route default (e.g. admin.ts uses addHook)
  const fileAuth: 'public' | 'user' | 'admin' = src.match(/addHook\(['"]preHandler['"],\s*app\.requireAdmin/)
    ? 'admin'
    : src.match(/addHook\(['"]preHandler['"],\s*app\.requireUser/)
      ? 'user'
      : 'public';

  for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
    const re = new RegExp(`app\\.${method}\\s*(?:<[^>]+>)?\\(`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const chunk = src.slice(m.index, m.index + 1200);
      const pathM = chunk.match(/^app\.\w+(?:<[^>]+>)?\(\s*['"]([^'"]+)['"]/);
      if (!pathM) continue;

      // Per-route preHandler overrides file-level default
      let auth: RouteInfo['auth'] = fileAuth;
      if (chunk.match(/preHandler:\s*app\.requireAdmin/)) auth = 'admin';
      else if (chunk.match(/preHandler:\s*app\.requireUser/)) auth = 'user';

      const viewM = chunk.match(/renderPage\(\s*['"]([^'"]+)['"]/);
      routes.push({ method: method.toUpperCase(), path: pathM[1], auth, file, view: viewM?.[1] ?? null });
    }
  }
  return routes;
}

// ── DB schema extraction ──────────────────────────────────────────────────────

interface ColumnInfo {
  name: string;
  type: string;
  constraints: string[];
}

interface FKInfo {
  column: string;
  referencesTable: string;
  referencesColumn: string;
}

interface TableInfo {
  name: string;
  variableName: string;
  columns: ColumnInfo[];
  foreignKeys: FKInfo[];
}

function extractSchema(schemaFile: string): TableInfo[] {
  const src = read(schemaFile);

  // Build JS variable → SQL table name map first (needed for FK resolution)
  const varToTable: Record<string, string> = {};
  const varRe = /export const (\w+) = sqliteTable/g;
  // We collect var names now; table names come from per-block parsing below
  const varNames: string[] = [];
  let vm: RegExpExecArray | null;
  while ((vm = varRe.exec(src)) !== null) varNames.push(vm[1]);

  // Split into blocks at each table declaration
  const blocks = src.split(/(?=export const \w+ = sqliteTable)/);
  const tables: TableInfo[] = [];

  for (const block of blocks) {
    // Table name may be inline or on next line: sqliteTable('name' or sqliteTable(\n  'name'
    const headerM = block.match(/export const (\w+) = sqliteTable[\s\S]*?['"]([^'"]+)['"]/);
    if (!headerM) continue;

    const table: TableInfo = {
      name: headerM[2],
      variableName: headerM[1],
      columns: [],
      foreignKeys: [],
    };
    varToTable[headerM[1]] = headerM[2];

    const lines = block.split('\n');
    const COL_RE = /^(\s+)(\w+):\s*(integer|text)\(\s*['"]([^'"]+)['"]/;

    // Find the minimum indent at which column definitions appear
    let colIndent: number | null = null;
    for (const line of lines) {
      const cm = line.match(COL_RE);
      if (!cm) continue;
      const n = cm[1].length;
      if (colIndent === null || n < colIndent) colIndent = n;
    }
    if (colIndent === null) continue;

    // Group lines into per-column blocks: a new block starts whenever a line
    // matches COL_RE at exactly colIndent spaces.
    type ColBlock = { propName: string; dbName: string; type: string; text: string };
    const colBlocks: ColBlock[] = [];
    let cur: ColBlock | null = null;

    for (const line of lines) {
      const cm = line.match(COL_RE);
      if (cm && cm[1].length === colIndent) {
        if (cur) colBlocks.push(cur);
        cur = { propName: cm[2], dbName: cm[4], type: cm[3], text: line };
      } else if (cur) {
        cur.text += '\n' + line;
      }
    }
    if (cur) colBlocks.push(cur);

    for (const cb of colBlocks) {
      const constraints: string[] = [];
      if (cb.text.includes('.primaryKey')) constraints.push('PK');
      if (cb.text.includes('.unique()')) constraints.push('UK');
      if (cb.text.includes('.notNull()')) constraints.push('NOT NULL');

      // FK: .references(() => varName.colName
      const refM = cb.text.match(/\.references\(\s*\(\)\s*=>\s*(\w+)\.(\w+)/);
      if (refM) {
        constraints.push('FK');
        // Resolve at end once all tables are parsed; store var name for now
        table.foreignKeys.push({ column: cb.dbName, referencesTable: refM[1], referencesColumn: refM[2] });
      }

      table.columns.push({ name: cb.dbName, type: cb.type, constraints });
    }

    if (table.columns.length > 0) tables.push(table);
  }

  // Resolve FK var names → table names now that varToTable is complete
  for (const t of tables) {
    for (const fk of t.foreignKeys) {
      fk.referencesTable = varToTable[fk.referencesTable] ?? fk.referencesTable;
    }
  }

  return tables;
}

// ── Alpine component extraction ───────────────────────────────────────────────

interface AlpineComponent {
  kind: 'store' | 'data';
  name: string;
  file: string;
}

function extractAlpine(files: string[]): AlpineComponent[] {
  const out: AlpineComponent[] = [];
  const seen = new Set<string>();

  for (const abs of files) {
    const src = read(abs);
    const file = rel(abs);

    // store registration requires a second argument (value to store)
    const storeRe = /Alpine\.store\(\s*['"]([^'"]+)['"]\s*,/g;
    // data() always registers (factory function is the second arg)
    const dataRe = /Alpine\.data\(\s*['"]([^'"]+)['"]/g;

    let m: RegExpExecArray | null;
    while ((m = storeRe.exec(src)) !== null) {
      const key = `store:${m[1]}`;
      if (!seen.has(key)) { seen.add(key); out.push({ kind: 'store', name: m[1], file }); }
    }
    while ((m = dataRe.exec(src)) !== null) {
      const key = `data:${m[1]}`;
      if (!seen.has(key)) { seen.add(key); out.push({ kind: 'data', name: m[1], file }); }
    }
  }
  return out;
}

// ── Mermaid generators ────────────────────────────────────────────────────────

function mermaidModuleGraph(nodes: FileNode[]): string {
  const KEEP = /src\/(server\/(index|env|db\/|lib\/|plugins\/|routes\/)|client\/(main|components\/))/;
  const key = nodes.filter((n) => KEEP.test(n.path));
  const pathSet = new Set(key.map((n) => n.path));

  const TOP = new Set(['src/server/index.ts', 'src/server/env.ts', 'src/client/main.ts']);
  const subgraphOrder = [
    'src/server/db',
    'src/server/lib',
    'src/server/plugins',
    'src/server/routes',
    'src/client/components',
  ];

  const byGroup = new Map<string, FileNode[]>();
  for (const n of key) {
    const group = TOP.has(n.path) ? '__top__' : n.path.split('/').slice(0, 3).join('/');
    const bucket = byGroup.get(group) ?? [];
    bucket.push(n);
    byGroup.set(group, bucket);
  }

  const lines: string[] = ['graph LR'];

  for (const n of byGroup.get('__top__') ?? []) {
    lines.push(`  ${mid(n.path)}["${basename(n.path, '.ts')}"]`);
  }

  for (const group of subgraphOrder) {
    const gnodes = byGroup.get(group);
    if (!gnodes?.length) continue;
    const label = group.replace('src/server/', '').replace('src/client/', 'client/');
    lines.push(`  subgraph ${mid(group)}["${label}"]`);
    for (const n of gnodes) lines.push(`    ${mid(n.path)}["${basename(n.path, '.ts')}"]`);
    lines.push('  end');
  }

  const seen = new Set<string>();
  for (const n of key) {
    for (const imp of n.imports) {
      if (!pathSet.has(imp)) continue;
      const edge = `  ${mid(n.path)} --> ${mid(imp)}`;
      if (!seen.has(edge)) { seen.add(edge); lines.push(edge); }
    }
  }

  return lines.join('\n');
}

function mermaidER(tables: TableInfo[]): string {
  const lines: string[] = ['erDiagram'];

  for (const t of tables) {
    lines.push(`  ${t.name} {`);
    for (const col of t.columns) {
      const cs = col.constraints.filter((c) => c !== 'NOT NULL' && c !== 'FK').join(' ');
      lines.push(`    ${col.type} ${col.name}${cs ? ' ' + cs : ''}`);
    }
    lines.push('  }');
  }

  // Deduplicate relationships
  const relSeen = new Set<string>();
  for (const t of tables) {
    for (const fk of t.foreignKeys) {
      const key = `${fk.referencesTable}||--o{${t.name}`;
      if (!relSeen.has(key)) {
        relSeen.add(key);
        lines.push(`  ${fk.referencesTable} ||--o{ ${t.name} : ""`);
      }
    }
  }

  return lines.join('\n');
}

function mermaidRouteFlow(routes: RouteInfo[]): string {
  const byAuth: Record<string, string[]> = { public: [], user: [], admin: [] };
  for (const r of routes) byAuth[r.auth].push(`${r.method} ${r.path}`);

  const lines: string[] = ['graph TD'];
  lines.push('  Req([HTTP Request])');
  lines.push('  Req --> SessionHook[Session hook\\nresolve userId]');
  lines.push('  SessionHook --> Guard{Auth guard}');
  lines.push('  Guard -->|public| PubRoutes[Public routes]');
  lines.push('  Guard -->|requireUser| UserRoutes[User routes]');
  lines.push('  Guard -->|requireAdmin| AdminRoutes[Admin routes]');
  lines.push('  UserRoutes -->|no session| LoginRedir[redirect /login]');
  lines.push('  AdminRoutes -->|not admin| Forbidden[403 /pages/error]');

  if (byAuth.public.length)
    lines.push(`  PubRoutes --> PubList["${byAuth.public.join('\n')}"]`);
  if (byAuth.user.length)
    lines.push(`  UserRoutes --> UserList["${byAuth.user.join('\n')}"]`);
  if (byAuth.admin.length)
    lines.push(`  AdminRoutes --> AdminList["${byAuth.admin.join('\n')}"]`);

  return lines.join('\n');
}

function mermaidAlpine(components: AlpineComponent[]): string {
  const lines: string[] = ['graph LR'];
  lines.push('  main["client/main.ts"]');
  for (const c of components) {
    const id = `${c.kind}_${mid(c.name)}`;
    lines.push(`  ${id}["${c.kind}: ${c.name}"]`);
    lines.push(`  main --> ${id}`);
  }
  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const tsFiles = walk(join(ROOT, 'src'), ['.ts']);
const routeFiles = tsFiles.filter((f) => f.includes('/routes/'));
const clientFiles = tsFiles.filter((f) => f.includes('/client/'));

const depGraph = buildDepGraph(tsFiles);
const allRoutes = routeFiles.flatMap(extractRoutes);
const schema = extractSchema(join(ROOT, 'src/server/db/schema.ts'));
const alpine = extractAlpine(clientFiles);

// ── CODEGRAPH.json ────────────────────────────────────────────────────────────

const json = {
  meta: {
    generated: new Date().toISOString(),
    generator: 'scripts/codegraph.ts',
    note: 'Static analysis snapshot. Re-run `pnpm codegraph` after structural changes.',
  },
  routes: allRoutes,
  schema: {
    tables: Object.fromEntries(
      schema.map((t) => [
        t.name,
        { variableName: t.variableName, columns: t.columns, foreignKeys: t.foreignKeys },
      ]),
    ),
    relationships: schema.flatMap((t) =>
      t.foreignKeys.map((fk) => ({
        from: t.name,
        fromColumn: fk.column,
        to: fk.referencesTable,
        toColumn: fk.referencesColumn,
        cardinality: 'N:1',
      })),
    ),
  },
  alpine: {
    stores: alpine.filter((c) => c.kind === 'store'),
    dataComponents: alpine.filter((c) => c.kind === 'data'),
  },
  modules: Object.fromEntries(
    depGraph
      .filter((n) => /^src\//.test(n.path))
      .map((n) => [n.path, { localImports: n.imports }]),
  ),
};

writeFileSync(join(ROOT, 'CODEGRAPH.json'), JSON.stringify(json, null, 2));

// ── CODEGRAPH.md ──────────────────────────────────────────────────────────────

const ts = new Date().toISOString();
const md = `# Sweet Potato — Codegraph
<!-- Generated ${ts} by scripts/codegraph.ts — run \`pnpm codegraph\` to update -->

## Module Dependencies

\`\`\`mermaid
${mermaidModuleGraph(depGraph)}
\`\`\`

## Database Schema

\`\`\`mermaid
${mermaidER(schema)}
\`\`\`

## Request Flow & Auth Guards

\`\`\`mermaid
${mermaidRouteFlow(allRoutes)}
\`\`\`

## Alpine Client Components

\`\`\`mermaid
${mermaidAlpine(alpine)}
\`\`\`
`;

writeFileSync(join(ROOT, 'CODEGRAPH.md'), md);

const nStores = alpine.filter((c) => c.kind === 'store').length;
const nData = alpine.filter((c) => c.kind === 'data').length;
console.log(`✓ CODEGRAPH.md + CODEGRAPH.json (${allRoutes.length} routes · ${schema.length} tables · ${nStores} stores · ${nData} data components)`);
