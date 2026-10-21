import fs from 'node:fs';
import path from 'node:path';

export const KNOWN_GATES = Object.freeze([
  'usuario_ativo_sistema', 'usuario_tem_acesso_empresa', 'usuario_tem_acesso_tenant',
  'usuario_admin_global', 'camera_ia_autorizar_visualizacao',
]);

const EXTENSIONS = /\.(sql|js|jsx|mjs|cjs|ts|tsx)$/i;

const EXCLUDE_DIR =
  new Set([
    '.git',
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.next',
    '.vercel',
    '.supabase',
    '.cache',
    'vendor',
  ]);

const EXCLUDE_FILE =
  /(?:\.test\.|\.spec\.|\.min\.|\.snap$)/i;

const sourcePrefixes = [
  'supabase/migrations/',
  'supabase/functions/',
  'src/',
  'infra/',
];

export function normalizeName(value) {
  return String(value ?? '')
    .replaceAll('"', '')
    .toLowerCase();
}

export function locIndex(content) {
  const starts = [0];

  for (
    let index = 0;
    index < content.length;
    index += 1
  ) {
    if (
      content.charCodeAt(index) === 10
    ) {
      starts.push(index + 1);
    }
  }

  return (position) => {
    let low = 0;
    let high = starts.length - 1;

    while (low < high) {
      const middle =
        (low + high + 1) >> 1;

      if (
        starts[middle] <= position
      ) {
        low = middle;
      }
      else {
        high = middle - 1;
      }
    }

    return low + 1;
  };
}

export function sqlWithoutComments(raw) {
  return raw
    .replace(
      /--[^\r\n]*/g,
      match =>
        ' '.repeat(match.length),
    )
    .replace(
      /\/\*[\s\S]*?\*\//g,
      match =>
        match.replace(
          /[^\r\n]/g,
          ' ',
        ),
    );
}

export function collect(root) {
  const result = [];

  function visit(
    directory,
    depth,
  ) {
    if (depth > 14) {
      return;
    }

    for (
      const entry of
      fs.readdirSync(
        directory,
        {
          withFileTypes: true,
        },
      )
    ) {
      if (
        entry.isSymbolicLink() ||
        EXCLUDE_DIR.has(entry.name)
      ) {
        continue;
      }

      const absolute =
        path.join(
          directory,
          entry.name,
        );

      if (entry.isDirectory()) {
        visit(
          absolute,
          depth + 1,
        );

        continue;
      }

      if (
        !entry.isFile() ||
        !EXTENSIONS.test(entry.name) ||
        EXCLUDE_FILE.test(entry.name)
      ) {
        continue;
      }

      const relative =
        path
          .relative(
            root,
            absolute,
          )
          .replaceAll(
            '\\',
            '/',
          );

      if (
        !sourcePrefixes.some(
          prefix =>
            relative.startsWith(prefix),
        )
      ) {
        continue;
      }

      const stat =
        fs.statSync(absolute);

      if (
        stat.size > 2_000_000
      ) {
        continue;
      }

      result.push({
        abs: absolute,
        rel: relative,
      });

      if (
        result.length > 12000
      ) {
        throw new Error(
          'SAFE_STOP: excessive source file count',
        );
      }
    }
  }

  visit(
    root,
    0,
  );

  return result.sort(
    (left, right) =>
      left.rel.localeCompare(
        right.rel,
      ),
  );
}

export function functionRanges(
  sql,
  lineOf,
  relative,
) {
  const functionPattern =
    /\bcreate\s+(?:or\s+replace\s+)?function\s+((?:"?[a-z_][\w]*"?\.)?"?[a-z_][\w]*"?)\s*\(/gi;

  const list = [];

  for (
    const match of
    sql.matchAll(functionPattern)
  ) {
    const prefix =
      sql.slice(
        match.index,
        match.index + 2400,
      );

    const opening =
      /\bas\s+(\$[a-z_0-9]*\$)/i
        .exec(prefix);

    let end =
      match.index +
      match[0].length;

    if (opening) {
      const bodyStart =
        match.index +
        opening.index +
        opening[0].length;

      const offset =
        sql.indexOf(
          opening[1],
          bodyStart,
        );

      if (offset !== -1) {
        end =
          offset +
          opening[1].length;
      }
    }

    list.push({
      start: match.index,
      end,
      name:
        normalizeName(match[1]),
      line:
        lineOf(match.index),
      file:
        relative,
    });
  }

  return list;
}

export function owningFunction(
  ranges,
  index,
) {
  for (
    let current = ranges.length - 1;
    current >= 0;
    current -= 1
  ) {
    if (
      ranges[current].start <= index &&
      index < ranges[current].end
    ) {
      return ranges[current].name;
    }
  }

  return null;
}

export function renderAuditMarkdown(
  report,
  title,
) {
  const lines = [
    title,
    '',
    '> Auditoria estática read-only; **não comprova cobertura exaustiva** de mutações nem autoriza migration.',
    '',
    `Arquivos examinados: **${report.filesScanned}** (SQL: ${report.sqlFiles}; JavaScript/TypeScript: ${report.jsFiles}).`,
    '',
    '| Domínio | Tabelas | Candidatos | SQL DML | DML Supabase | Triggers | Cobertura |',
    '|---|---|---:|---:|---:|---:|---|',
    ...Object.entries(report.domains).map(
      ([domain, data]) =>
        `| ${domain} | ${data.tables.map(table => '\x60' + table + '\x60').join(', ')} | ${data.candidateCount} | ${data.sqlMutations} | ${data.javascriptMutations} | ${data.triggers} | ${data.coverage} |`,
    ),
    '',
    '## Evidências que ainda exigem revisão',
    `- RPCs referenciadas em JS/TS: **${report.evidence.rpcCalls.length}** (candidatas; não prova de mutação).`,
    `- Funções SQL declaradas detectadas: **${report.evidence.definitions.length}** (a definição efetiva depende da ordem das migrations).`,
    `- SQL dinâmico/referências dinâmicas: **${report.evidence.dynamic.length}** candidatas.`,
    `- Chamadas diretas às APIs Auth de escrita: **${report.evidence.externalWrites.length}** candidatas.`,
    `- Dependências FK com ação no DELETE: **${report.evidence.cascades.length}** candidatas.`,
    '',
    '## Funções de autorização ainda não localizadas na amostra',
    report.missingGates.length
      ? report.missingGates
          .map(
            name =>
              '- `' + name + '`',
          )
          .join('\n')
      : '- Todas as cinco funções principais aparecem em alguma fonte analisada; isso **não** demonstra suas definições finais ou cobertura de mutações.',
    '',
    '## Exemplos por domínio (arquivo:linha)',
    ...Object.entries(report.domains)
      .flatMap(
        ([domain]) => [
          '### ' + domain,
          ...report.rows
            .filter(
              row =>
                row.domain === domain &&
                row.kind !==
                  'SUPABASE_READ_OR_UNKNOWN',
            )
            .slice(
              0,
              18,
            )
            .map(
              row =>
                `- ${row.operation} ${row.kind} — \x60${row.file}:${row.line}\x60; contexto: \x60${row.owner || 'fora de função identificada'}\x60`,
            ),
          '',
        ],
      ),
    '## Critérios que permanecem abertos',
    ...report.obligations.map(
      obligation =>
        '- ' + obligation,
    ),
    '',
    '**B5B3B2_R1_COVERAGE=NOT_PROVEN**',
    '**MIGRATION_CREATED=FALSE**',
    '**DISTRIBUTED_INVALIDATION=NOT_IMPLEMENTED**',
    '',
    'Os detalhes completos e as localizações estão nos arquivos CSV e JSON. Não executar migration nem inferir cobertura completa por contagem de ocorrências.',
  ];

  return (
    lines.join('\n') +
    '\n'
  );
}