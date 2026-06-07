import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'api', 'data', 'db.json');

type Row = Record<string, any>;
type Collections = Record<string, Row[]>;

let collections: Collections = {};

function loadDb(): void {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      collections = raw ? JSON.parse(raw) : {};
    } else {
      collections = {};
      saveDb();
    }
  } catch {
    collections = {};
    saveDb();
  }
}

function saveDb(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(collections, null, 2), 'utf-8');
}

loadDb();

function ensureTable(name: string): void {
  if (!collections[name]) {
    collections[name] = [];
  }
}

interface ParsedSQL {
  type: 'select' | 'insert' | 'update' | 'delete' | 'create';
}

interface SelectParsed extends ParsedSQL {
  type: 'select';
  columns: Array<{ expr: string; alias?: string; agg?: string; distinct?: boolean }>;
  from: { table: string; alias?: string };
  joins: Array<{ type: 'inner' | 'left'; table: string; alias?: string; on: { left: string; right: string } }>;
  where?: WhereNode;
  groupBy?: string[];
  orderBy?: Array<{ col: string; dir: 'asc' | 'desc' }>;
  limit?: number;
}

interface InsertParsed extends ParsedSQL {
  type: 'insert';
  table: string;
  columns: string[];
  valuesCount: number;
}

interface UpdateParsed extends ParsedSQL {
  type: 'update';
  table: string;
  sets: Array<{ col: string; value: ValueExpr }>;
  where?: WhereNode;
}

interface DeleteParsed extends ParsedSQL {
  type: 'delete';
  table: string;
  where?: WhereNode;
}

interface CreateParsed extends ParsedSQL {
  type: 'create';
  table: string;
}

type ValueExpr =
  | { kind: 'param'; index: number }
  | { kind: 'column'; name: string }
  | { kind: 'literal'; value: any }
  | { kind: 'func'; name: string; args: ValueExpr[] }
  | { kind: 'binary'; op: string; left: ValueExpr; right: ValueExpr };

type WhereNode =
  | { kind: 'and'; left: WhereNode; right: WhereNode }
  | { kind: 'or'; left: WhereNode; right: WhereNode }
  | { kind: 'cond'; left: ValueExpr; op: string; right: ValueExpr }
  | { kind: 'in'; left: ValueExpr; values: ValueExpr[] }
  | { kind: 'isnull'; left: ValueExpr }
  | { kind: 'notnull'; left: ValueExpr };

class Tokenizer {
  private pos = 0;
  private sql: string;

  constructor(sql: string) {
    this.sql = sql;
  }

  private skipWhitespace(): void {
    while (this.pos < this.sql.length && /\s/.test(this.sql[this.pos])) {
      this.pos++;
    }
  }

  peek(): string {
    this.skipWhitespace();
    return this.sql[this.pos] || '';
  }

  eof(): boolean {
    this.skipWhitespace();
    return this.pos >= this.sql.length;
  }

  eat(ch: string): boolean {
    this.skipWhitespace();
    if (this.sql[this.pos] === ch) {
      this.pos++;
      return true;
    }
    return false;
  }

  expect(ch: string): void {
    if (!this.eat(ch)) {
      throw new Error(`Expected '${ch}' at position ${this.pos}`);
    }
  }

  readIdentifier(): string {
    this.skipWhitespace();
    let start = this.pos;
    if (this.sql[this.pos] === '"' || this.sql[this.pos] === '`') {
      const quote = this.sql[this.pos];
      this.pos++;
      start = this.pos;
      while (this.pos < this.sql.length && this.sql[this.pos] !== quote) {
        this.pos++;
      }
      const id = this.sql.slice(start, this.pos);
      this.pos++;
      return id;
    }
    while (this.pos < this.sql.length && /[a-zA-Z0-9_]/.test(this.sql[this.pos])) {
      this.pos++;
    }
    return this.sql.slice(start, this.pos);
  }

  readString(): string {
    this.skipWhitespace();
    const quote = this.sql[this.pos];
    this.pos++;
    let result = '';
    while (this.pos < this.sql.length) {
      if (this.sql[this.pos] === quote) {
        if (this.sql[this.pos + 1] === quote) {
          result += quote;
          this.pos += 2;
        } else {
          this.pos++;
          break;
        }
      } else {
        result += this.sql[this.pos];
        this.pos++;
      }
    }
    return result;
  }

  readNumber(): number {
    this.skipWhitespace();
    const start = this.pos;
    while (this.pos < this.sql.length && /[0-9.]/.test(this.sql[this.pos])) {
      this.pos++;
    }
    return parseFloat(this.sql.slice(start, this.pos));
  }

  isKeyword(kw: string): boolean {
    this.skipWhitespace();
    const saved = this.pos;
    const id = this.readIdentifier();
    const match = id.toLowerCase() === kw.toLowerCase();
    this.pos = saved;
    return match;
  }

  eatKeyword(kw: string): boolean {
    if (this.isKeyword(kw)) {
      this.skipWhitespace();
      this.readIdentifier();
      return true;
    }
    return false;
  }

  expectKeyword(kw: string): void {
    if (!this.eatKeyword(kw)) {
      throw new Error(`Expected keyword '${kw}' at position ${this.pos}`);
    }
  }
}

class Parser {
  private t: Tokenizer;
  private paramIndex = 0;

  constructor(sql: string) {
    this.t = new Tokenizer(sql);
  }

  parse(): ParsedSQL {
    if (this.t.eatKeyword('SELECT')) {
      return this.parseSelect();
    }
    if (this.t.eatKeyword('INSERT')) {
      return this.parseInsert();
    }
    if (this.t.eatKeyword('UPDATE')) {
      return this.parseUpdate();
    }
    if (this.t.eatKeyword('DELETE')) {
      return this.parseDelete();
    }
    if (this.t.eatKeyword('CREATE')) {
      return this.parseCreate();
    }
    throw new Error('Unsupported SQL: ' + this.t.peek());
  }

  private parseSelect(): SelectParsed {
    const result: SelectParsed = {
      type: 'select',
      columns: [],
      from: { table: '' },
      joins: [],
    };

    let distinct = false;
    if (this.t.eatKeyword('DISTINCT')) {
      distinct = true;
    }

    result.columns = this.parseSelectColumns(distinct);

    this.t.expectKeyword('FROM');
    result.from.table = this.t.readIdentifier();
    if (!this.t.isKeyword('WHERE') && !this.t.isKeyword('JOIN') && !this.t.isKeyword('LEFT') &&
        !this.t.isKeyword('INNER') && !this.t.isKeyword('ORDER') && !this.t.isKeyword('GROUP') &&
        !this.t.isKeyword('LIMIT') && !this.t.eof()) {
      const ch = this.t.peek();
      if (ch && /[a-zA-Z]/.test(ch)) {
        result.from.alias = this.t.readIdentifier();
      }
    }

    while (this.t.eatKeyword('LEFT') || this.t.eatKeyword('INNER') || this.t.eatKeyword('JOIN')) {
      const joinType: 'inner' | 'left' = this.t.eatKeyword('JOIN') ? 'left' : 'inner';
      if (joinType === 'left') {
        this.t.eatKeyword('OUTER');
      }
      this.t.expectKeyword('JOIN');
      const table = this.t.readIdentifier();
      let alias: string | undefined;
      if (!this.t.isKeyword('ON') && !this.t.eof()) {
        const ch = this.t.peek();
        if (ch && /[a-zA-Z]/.test(ch)) {
          alias = this.t.readIdentifier();
        }
      }
      this.t.expectKeyword('ON');
      const left = this.t.readIdentifier();
      this.t.expect('=');
      const right = this.t.readIdentifier();
      result.joins.push({ type: joinType, table, alias, on: { left, right } });
    }

    if (this.t.eatKeyword('WHERE')) {
      result.where = this.parseWhere();
    }

    if (this.t.eatKeyword('GROUP')) {
      this.t.expectKeyword('BY');
      result.groupBy = [this.t.readIdentifier()];
    }

    if (this.t.eatKeyword('ORDER')) {
      this.t.expectKeyword('BY');
      result.orderBy = [];
      do {
        const col = this.t.readIdentifier();
        let dir: 'asc' | 'desc' = 'asc';
        if (this.t.eatKeyword('DESC')) {
          dir = 'desc';
        } else {
          this.t.eatKeyword('ASC');
        }
        result.orderBy.push({ col, dir });
      } while (this.t.eat(','));
    }

    if (this.t.eatKeyword('LIMIT')) {
      result.limit = this.t.readNumber();
    }

    return result;
  }

  private parseSelectColumns(distinct: boolean): SelectParsed['columns'] {
    const cols: SelectParsed['columns'] = [];
    do {
      if (this.t.peek() === '*') {
        this.t.eat('*');
        cols.push({ expr: '*', distinct });
      } else {
        const expr = this.parseValueExpr();
        let alias: string | undefined;
        if (this.t.eatKeyword('AS')) {
          alias = this.t.readIdentifier();
        } else if (!this.t.peek().match(/[,)]/) && !this.t.isKeyword('FROM') && !this.t.eof()) {
          const ch = this.t.peek();
          if (ch && /[a-zA-Z]/.test(ch)) {
            alias = this.t.readIdentifier();
          }
        }
        if (expr.kind === 'func' || expr.kind === 'column') {
          const colExpr = expr.kind === 'func' ? `${expr.name}(${expr.args.map(a => a.kind === 'column' ? a.name : a.kind === 'literal' ? String(a.value) : '*').join(',')})` : expr.name;
          cols.push({ expr: colExpr, alias, agg: expr.kind === 'func' ? expr.name.toLowerCase() : undefined, distinct });
        } else if (expr.kind === 'literal') {
          cols.push({ expr: String(expr.value), alias, distinct });
        }
      }
    } while (this.t.eat(','));
    return cols;
  }

  private parseInsert(): InsertParsed {
    this.t.expectKeyword('INTO');
    const table = this.t.readIdentifier();
    ensureTable(table);

    this.t.expect('(');
    const columns: string[] = [];
    do {
      columns.push(this.t.readIdentifier());
    } while (this.t.eat(','));
    this.t.expect(')');

    this.t.expectKeyword('VALUES');
    this.t.expect('(');
    let valuesCount = 0;
    do {
      this.parseValueExpr();
      valuesCount++;
    } while (this.t.eat(','));
    this.t.expect(')');

    return { type: 'insert', table, columns, valuesCount };
  }

  private parseUpdate(): UpdateParsed {
    const table = this.t.readIdentifier();
    ensureTable(table);
    const result: UpdateParsed = { type: 'update', table, sets: [] };

    this.t.expectKeyword('SET');
    do {
      const col = this.t.readIdentifier();
      this.t.expect('=');
      const value = this.parseValueExpr();
      result.sets.push({ col, value });
    } while (this.t.eat(','));

    if (this.t.eatKeyword('WHERE')) {
      result.where = this.parseWhere();
    }

    return result;
  }

  private parseDelete(): DeleteParsed {
    this.t.expectKeyword('FROM');
    const table = this.t.readIdentifier();
    ensureTable(table);
    const result: DeleteParsed = { type: 'delete', table };

    if (this.t.eatKeyword('WHERE')) {
      result.where = this.parseWhere();
    }

    return result;
  }

  private parseCreate(): CreateParsed {
    this.t.eatKeyword('TABLE');
    this.t.eatKeyword('IF');
    this.t.eatKeyword('NOT');
    this.t.eatKeyword('EXISTS');
    const table = this.t.readIdentifier();
    ensureTable(table);
    return { type: 'create', table };
  }

  private parseWhere(): WhereNode {
    return this.parseOr();
  }

  private parseOr(): WhereNode {
    let left = this.parseAnd();
    while (this.t.eatKeyword('OR')) {
      const right = this.parseAnd();
      left = { kind: 'or', left, right };
    }
    return left;
  }

  private parseAnd(): WhereNode {
    let left = this.parseCond();
    while (this.t.eatKeyword('AND')) {
      const right = this.parseCond();
      left = { kind: 'and', left, right };
    }
    return left;
  }

  private parseCond(): WhereNode {
    if (this.t.eat('(')) {
      const node = this.parseWhere();
      this.t.expect(')');
      return node;
    }

    const left = this.parseValueExpr();

    if (this.t.eatKeyword('IS')) {
      if (this.t.eatKeyword('NULL')) {
        return { kind: 'isnull', left };
      }
      if (this.t.eatKeyword('NOT')) {
        this.t.expectKeyword('NULL');
        return { kind: 'notnull', left };
      }
    }

    if (this.t.eatKeyword('IN')) {
      this.t.expect('(');
      const values: ValueExpr[] = [];
      do {
        values.push(this.parseValueExpr());
      } while (this.t.eat(','));
      this.t.expect(')');
      return { kind: 'in', left, values };
    }

    let op = '=';
    const ch = this.t.peek();
    if (ch === '<') {
      this.t.eat('<');
      if (this.t.eat('=')) {
        op = '<=';
      } else if (this.t.eat('>')) {
        op = '<>';
      } else {
        op = '<';
      }
    } else if (ch === '>') {
      this.t.eat('>');
      if (this.t.eat('=')) {
        op = '>=';
      } else {
        op = '>';
      }
    } else if (ch === '=') {
      this.t.eat('=');
      op = '=';
    } else if (ch === '!') {
      this.t.eat('!');
      this.t.expect('=');
      op = '<>';
    } else if (this.t.isKeyword('LIKE')) {
      this.t.eatKeyword('LIKE');
      op = 'LIKE';
    }

    const right = this.parseValueExpr();
    return { kind: 'cond', left, op, right };
  }

  private parseValueExpr(): ValueExpr {
    return this.parseBinaryExpr();
  }

  private parseBinaryExpr(): ValueExpr {
    let left = this.parsePrimaryExpr();
    while (true) {
      const ch = this.t.peek();
      if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
        const op = ch;
        this.t.eat(ch);
        const right = this.parsePrimaryExpr();
        left = { kind: 'binary', op, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parsePrimaryExpr(): ValueExpr {
    const ch = this.t.peek();

    if (ch === '?') {
      this.t.eat('?');
      return { kind: 'param', index: this.paramIndex++ };
    }

    if (ch === "'" || ch === '"') {
      return { kind: 'literal', value: this.t.readString() };
    }

    if (ch && /[0-9]/.test(ch)) {
      return { kind: 'literal', value: this.t.readNumber() };
    }

    if (ch === '(') {
      this.t.eat('(');
      const expr = this.parseValueExpr();
      this.t.expect(')');
      return expr;
    }

    if (ch === '-' || ch === '+') {
      this.t.eat(ch);
      const num = this.t.readNumber();
      return { kind: 'literal', value: ch === '-' ? -num : num };
    }

    const ident = this.t.readIdentifier();
    const identLower = ident.toLowerCase();

    if (identLower === 'null') {
      return { kind: 'literal', value: null };
    }
    if (identLower === 'true') {
      return { kind: 'literal', value: 1 };
    }
    if (identLower === 'false') {
      return { kind: 'literal', value: 0 };
    }

    if (this.t.peek() === '(') {
      this.t.eat('(');
      const args: ValueExpr[] = [];
      if (this.t.peek() !== ')') {
        do {
          if (this.t.peek() === '*') {
            this.t.eat('*');
            args.push({ kind: 'literal', value: '*' });
          } else if (this.t.isKeyword('DISTINCT')) {
            this.t.eatKeyword('DISTINCT');
            args.push({ kind: 'column', name: 'DISTINCT ' + this.t.readIdentifier() });
          } else {
            args.push(this.parseValueExpr());
          }
        } while (this.t.eat(','));
      }
      this.t.expect(')');
      return { kind: 'func', name: ident, args };
    }

    return { kind: 'column', name: ident };
  }
}

interface Statement {
  run(...params: any[]): { changes: number; lastInsertRowid: any };
  get(...params: any[]): Row | undefined;
  all(...params: any[]): Row[];
}

class JsonStatement implements Statement {
  private parsed: ParsedSQL;

  constructor(sql: string) {
    const parser = new Parser(sql);
    this.parsed = parser.parse();
  }

  run(...params: any[]): { changes: number; lastInsertRowid: any } {
    const p = this.parsed;
    if (p.type === 'insert') {
      return this.doInsert(p as InsertParsed, params);
    }
    if (p.type === 'update') {
      return this.doUpdate(p as UpdateParsed, params);
    }
    if (p.type === 'delete') {
      return this.doDelete(p as DeleteParsed, params);
    }
    if (p.type === 'create') {
      return { changes: 0, lastInsertRowid: undefined };
    }
    return { changes: 0, lastInsertRowid: undefined };
  }

  get(...params: any[]): Row | undefined {
    const rows = this.all(...params);
    return rows[0];
  }

  all(...params: any[]): Row[] {
    const p = this.parsed;
    if (p.type === 'select') {
      return this.doSelect(p as SelectParsed, params);
    }
    return [];
  }

  private evalValue(expr: ValueExpr, params: any[], row: Row, allRows?: Row[]): any {
    switch (expr.kind) {
      case 'param':
        return params[expr.index];
      case 'literal':
        return expr.value;
      case 'column': {
        let name = expr.name;
        if (name.startsWith('DISTINCT ')) {
          name = name.slice(9);
        }
        if (name.includes('.')) {
          const parts = name.split('.');
          name = parts[parts.length - 1];
        }
        return row[name];
      }
      case 'func': {
        const name = expr.name.toLowerCase();
        const arg = expr.args[0];
        if (name === 'coalesce') {
          for (const a of expr.args) {
            const v = this.evalValue(a, params, row);
            if (v !== null && v !== undefined) return v;
          }
          return null;
        }
        if (name === 'count') {
          if (!allRows) return 0;
          if (arg.kind === 'literal' && arg.value === '*') return allRows.length;
          let colName = arg.kind === 'column' ? arg.name : '';
          if (colName.startsWith('DISTINCT ')) {
            colName = colName.slice(9);
            const seen = new Set<any>();
            for (const r of allRows) {
              const v = r[colName];
              if (v !== null && v !== undefined) seen.add(v);
            }
            return seen.size;
          }
          let count = 0;
          for (const r of allRows) {
            const v = r[colName];
            if (v !== null && v !== undefined) count++;
          }
          return count;
        }
        if (name === 'sum') {
          if (!allRows) return 0;
          const colName = arg.kind === 'column' ? arg.name : '';
          let sum = 0;
          for (const r of allRows) {
            const v = Number(r[colName]) || 0;
            sum += v;
          }
          return sum;
        }
        if (name === 'max') {
          if (!allRows || allRows.length === 0) return 0;
          const colName = arg.kind === 'column' ? arg.name : '';
          let max: any = null;
          for (const r of allRows) {
            const v = r[colName];
            if (max === null || v > max) max = v;
          }
          return max === null ? 0 : max;
        }
        if (name === 'min') {
          if (!allRows || allRows.length === 0) return 0;
          const colName = arg.kind === 'column' ? arg.name : '';
          let min: any = null;
          for (const r of allRows) {
            const v = r[colName];
            if (min === null || v < min) min = v;
          }
          return min === null ? 0 : min;
        }
        return null;
      }
      case 'binary': {
        const l = Number(this.evalValue(expr.left, params, row)) || 0;
        const r = Number(this.evalValue(expr.right, params, row)) || 0;
        switch (expr.op) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/': return r === 0 ? 0 : l / r;
        }
        return null;
      }
    }
  }

  private resolveCol(col: string, row: Row): any {
    if (col.includes('.')) {
      const parts = col.split('.');
      return row[parts[parts.length - 1]];
    }
    return row[col];
  }

  private evalWhere(node: WhereNode, params: any[], row: Row): boolean {
    switch (node.kind) {
      case 'and':
        return this.evalWhere(node.left, params, row) && this.evalWhere(node.right, params, row);
      case 'or':
        return this.evalWhere(node.left, params, row) || this.evalWhere(node.right, params, row);
      case 'cond': {
        const leftVal = this.evalValue(node.left, params, row);
        const rightVal = this.evalValue(node.right, params, row);
        switch (node.op) {
          case '=':
            return leftVal == rightVal;
          case '<>':
            return leftVal != rightVal;
          case '<':
            return leftVal < rightVal;
          case '>':
            return leftVal > rightVal;
          case '<=':
            return leftVal <= rightVal;
          case '>=':
            return leftVal >= rightVal;
          case 'LIKE': {
            const pattern = String(rightVal).replace(/%/g, '.*').replace(/_/g, '.');
            const regex = new RegExp('^' + pattern + '$', 'i');
            return regex.test(String(leftVal ?? ''));
          }
        }
        return false;
      }
      case 'in': {
        const leftVal = this.evalValue(node.left, params, row);
        return node.values.some(v => this.evalValue(v, params, row) == leftVal);
      }
      case 'isnull': {
        const v = this.evalValue(node.left, params, row);
        return v === null || v === undefined;
      }
      case 'notnull': {
        const v = this.evalValue(node.left, params, row);
        return v !== null && v !== undefined;
      }
    }
  }

  private doInsert(p: InsertParsed, params: any[]): { changes: number; lastInsertRowid: any } {
    ensureTable(p.table);
    const row: Row = {};
    for (let i = 0; i < p.columns.length; i++) {
      let val = params[i];
      if (val === undefined) val = null;
      row[p.columns[i]] = val;
    }
    collections[p.table].push(row);
    saveDb();
    return { changes: 1, lastInsertRowid: row.id };
  }

  private evalUpdateValue(expr: ValueExpr, params: any[], row: Row, allRows: Row[]): any {
    if (expr.kind === 'column') {
      return row[expr.name];
    }
    if (expr.kind === 'func') {
      const name = expr.name.toLowerCase();
      if (name === 'coalesce') {
        for (const a of expr.args) {
          const v = this.evalUpdateValue(a, params, row, allRows);
          if (v !== null && v !== undefined) return v;
        }
        return null;
      }
      if (name === 'max') {
        const vals = expr.args.map(a => this.evalUpdateValue(a, params, row, allRows));
        let max: any = null;
        for (const v of vals) {
          if (max === null || (v !== null && v !== undefined && v > max)) max = v;
        }
        return max === null ? 0 : max;
      }
    }
    return this.evalValue(expr, params, row, allRows);
  }

  private doUpdate(p: UpdateParsed, params: any[]): { changes: number; lastInsertRowid: any } {
    const table = collections[p.table] || [];
    let changes = 0;
    for (const row of table) {
      if (!p.where || this.evalWhere(p.where, params, row)) {
        for (const s of p.sets) {
          const newVal = this.evalUpdateValue(s.value, params, row, table);
          row[s.col] = newVal === undefined ? null : newVal;
        }
        changes++;
      }
    }
    if (changes > 0) saveDb();
    return { changes, lastInsertRowid: undefined };
  }

  private doDelete(p: DeleteParsed, params: any[]): { changes: number; lastInsertRowid: any } {
    const table = collections[p.table] || [];
    if (!p.where) {
      const changes = table.length;
      collections[p.table] = [];
      if (changes > 0) saveDb();
      return { changes, lastInsertRowid: undefined };
    }
    const newTable: Row[] = [];
    let changes = 0;
    for (const row of table) {
      if (this.evalWhere(p.where, params, row)) {
        changes++;
      } else {
        newTable.push(row);
      }
    }
    collections[p.table] = newTable;
    if (changes > 0) saveDb();
    return { changes, lastInsertRowid: undefined };
  }

  private doSelect(p: SelectParsed, params: any[]): Row[] {
    let rows: Row[] = [...(collections[p.from.table] || [])];

    for (const join of p.joins) {
      const joinRows = collections[join.table] || [];
      const newRows: Row[] = [];
      const leftCol = join.on.left.includes('.') ? join.on.left.split('.').pop()! : join.on.left;
      const rightCol = join.on.right.includes('.') ? join.on.right.split('.').pop()! : join.on.right;

      if (rows.length === 0 && join.type === 'left') {
        for (const jr of joinRows) {
          const merged: Row = { ...jr };
          newRows.push(merged);
        }
      } else {
        for (const lr of rows) {
          let matched = false;
          for (const jr of joinRows) {
            if (lr[leftCol] == jr[rightCol]) {
              const merged: Row = { ...lr, ...jr };
              newRows.push(merged);
              matched = true;
            }
          }
          if (!matched && join.type === 'left') {
            newRows.push({ ...lr });
          }
        }
      }
      rows = newRows;
    }

    if (p.where) {
      rows = rows.filter(row => this.evalWhere(p.where!, params, row));
    }

    let resultRows: Row[];

    const hasAgg = p.columns.some(c => c.agg);
    if (hasAgg || p.groupBy) {
      const groups: Record<string, Row[]> = {};
      if (p.groupBy) {
        for (const row of rows) {
          const key = p.groupBy.map(g => String(row[g] ?? '')).join('|');
          if (!groups[key]) groups[key] = [];
          groups[key].push(row);
        }
      } else {
        groups['*'] = rows;
      }

      resultRows = [];
      for (const key in groups) {
        const groupRows = groups[key];
        const outRow: Row = {};
        for (const col of p.columns) {
          if (col.expr === '*') continue;
          let val: any;
          if (col.agg) {
            const aggName = col.agg;
            if (aggName === 'count') {
              if (col.expr.includes('DISTINCT')) {
                const match = col.expr.match(/DISTINCT\s+(\w+)/i);
                if (match) {
                  const seen = new Set<any>();
                  for (const r of groupRows) {
                    const v = r[match[1]];
                    if (v !== null && v !== undefined) seen.add(v);
                  }
                  val = seen.size;
                } else {
                  val = groupRows.length;
                }
              } else if (col.expr.includes('*')) {
                val = groupRows.length;
              } else {
                const match = col.expr.match(/count\((\w+)\)/i);
                if (match) {
                  let count = 0;
                  for (const r of groupRows) {
                    const v = r[match[1]];
                    if (v !== null && v !== undefined) count++;
                  }
                  val = count;
                } else {
                  val = groupRows.length;
                }
              }
            } else if (aggName === 'sum') {
              const match = col.expr.match(/sum\((\w+)\)/i);
              if (match) {
                let sum = 0;
                for (const r of groupRows) {
                  sum += Number(r[match[1]]) || 0;
                }
                val = sum;
              } else {
                val = 0;
              }
            } else if (aggName === 'max') {
              const match = col.expr.match(/max\((\w+)\)/i);
              if (match) {
                let m: any = null;
                for (const r of groupRows) {
                  const v = r[match[1]];
                  if (m === null || (v !== null && v !== undefined && v > m)) m = v;
                }
                val = m === null ? 0 : m;
              } else {
                val = 0;
              }
            } else if (aggName === 'min') {
              const match = col.expr.match(/min\((\w+)\)/i);
              if (match) {
                let m: any = null;
                for (const r of groupRows) {
                  const v = r[match[1]];
                  if (m === null || (v !== null && v !== undefined && v < m)) m = v;
                }
                val = m === null ? 0 : m;
              } else {
                val = 0;
              }
            } else if (aggName === 'coalesce') {
              const match = col.expr.match(/coalesce\(([^)]+)\)/i);
              if (match) {
                const parts = match[1].split(',').map(s => s.trim());
                val = null;
                for (const part of parts) {
                  if (part === '0') {
                    if (val === null) val = 0;
                  } else {
                    const sampleRow = groupRows[0] || {};
                    const v = sampleRow[part];
                    if (v !== null && v !== undefined) {
                      val = v;
                      break;
                    }
                  }
                }
                if (val === null) val = 0;
              }
            }
          } else {
            const sampleRow = groupRows[0] || {};
            val = sampleRow[col.expr];
          }
          const key = col.alias || col.expr;
          outRow[key] = val;
        }
        resultRows.push(outRow);
      }
    } else {
      resultRows = rows.map(row => {
        if (p.columns.length === 1 && p.columns[0].expr === '*') {
          return { ...row };
        }
        const out: Row = {};
        for (const col of p.columns) {
          if (col.expr === '*') continue;
          let val: any;
          if (col.expr.includes('(')) {
            const funcMatch = col.expr.match(/^(\w+)\((.*)\)$/);
            if (funcMatch) {
              const fname = funcMatch[1].toLowerCase();
              const farg = funcMatch[2].trim();
              if (fname === 'coalesce') {
                const parts = farg.split(',').map(s => s.trim());
                val = null;
                for (const part of parts) {
                  if (part === '0') {
                    if (val === null) val = 0;
                  } else {
                    const v = row[part];
                    if (v !== null && v !== undefined) {
                      val = v;
                      break;
                    }
                  }
                }
                if (val === null) val = null;
              } else {
                val = row[col.expr];
              }
            } else {
              val = row[col.expr];
            }
          } else {
            val = row[col.expr];
          }
          const key = col.alias || col.expr;
          out[key] = val;
        }
        return out;
      });
    }

    if (p.columns.length > 0 && p.columns[0].distinct && !hasAgg) {
      const seen = new Set<string>();
      const deduped: Row[] = [];
      for (const row of resultRows) {
        const key = JSON.stringify(row);
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(row);
        }
      }
      resultRows = deduped;
    }

    if (p.orderBy) {
      resultRows.sort((a, b) => {
        for (const ob of p.orderBy!) {
          let av = a[ob.col];
          let bv = b[ob.col];
          if (av === undefined || av === null) av = '';
          if (bv === undefined || bv === null) bv = '';
          let cmp = 0;
          if (typeof av === 'number' && typeof bv === 'number') {
            cmp = av - bv;
          } else {
            cmp = String(av).localeCompare(String(bv));
          }
          if (ob.dir === 'desc') cmp = -cmp;
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    if (p.limit !== undefined) {
      resultRows = resultRows.slice(0, p.limit);
    }

    return resultRows;
  }
}

interface DatabaseInstance {
  pragma(_sql: string): DatabaseInstance;
  exec(sql: string): void;
  prepare(sql: string): Statement;
  transaction<T>(fn: () => T): () => T;
}

const db: DatabaseInstance = {
  pragma(_sql: string): DatabaseInstance {
    return db;
  },

  exec(sql: string): void {
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      try {
        const s = new JsonStatement(stmt);
        s.run();
      } catch {
      }
    }
  },

  prepare(sql: string): Statement {
    return new JsonStatement(sql);
  },

  transaction<T>(fn: () => T): () => T {
    return function (): T {
      return fn();
    };
  },
};

export default db;
