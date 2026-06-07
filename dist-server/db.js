"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const DB_PATH = node_path_1.default.join(process.cwd(), 'api', 'data', 'db.json');
let collections = {};
function loadDb() {
    try {
        if (node_fs_1.default.existsSync(DB_PATH)) {
            const raw = node_fs_1.default.readFileSync(DB_PATH, 'utf-8');
            collections = raw ? JSON.parse(raw) : {};
        }
        else {
            collections = {};
            saveDb();
        }
    }
    catch {
        collections = {};
        saveDb();
    }
}
function saveDb() {
    const dir = node_path_1.default.dirname(DB_PATH);
    if (!node_fs_1.default.existsSync(dir)) {
        node_fs_1.default.mkdirSync(dir, { recursive: true });
    }
    node_fs_1.default.writeFileSync(DB_PATH, JSON.stringify(collections, null, 2), 'utf-8');
}
loadDb();
function ensureTable(name) {
    if (!collections[name]) {
        collections[name] = [];
    }
}
class Tokenizer {
    constructor(sql) {
        this.pos = 0;
        this.sql = sql;
    }
    skipWhitespace() {
        while (this.pos < this.sql.length && /\s/.test(this.sql[this.pos])) {
            this.pos++;
        }
    }
    peek() {
        this.skipWhitespace();
        return this.sql[this.pos] || '';
    }
    eof() {
        this.skipWhitespace();
        return this.pos >= this.sql.length;
    }
    eat(ch) {
        this.skipWhitespace();
        if (this.sql[this.pos] === ch) {
            this.pos++;
            return true;
        }
        return false;
    }
    expect(ch) {
        if (!this.eat(ch)) {
            throw new Error(`Expected '${ch}' at position ${this.pos}`);
        }
    }
    readIdentifier() {
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
    readString() {
        this.skipWhitespace();
        const quote = this.sql[this.pos];
        this.pos++;
        let result = '';
        while (this.pos < this.sql.length) {
            if (this.sql[this.pos] === quote) {
                if (this.sql[this.pos + 1] === quote) {
                    result += quote;
                    this.pos += 2;
                }
                else {
                    this.pos++;
                    break;
                }
            }
            else {
                result += this.sql[this.pos];
                this.pos++;
            }
        }
        return result;
    }
    readNumber() {
        this.skipWhitespace();
        const start = this.pos;
        while (this.pos < this.sql.length && /[0-9.]/.test(this.sql[this.pos])) {
            this.pos++;
        }
        return parseFloat(this.sql.slice(start, this.pos));
    }
    isKeyword(kw) {
        this.skipWhitespace();
        const saved = this.pos;
        const id = this.readIdentifier();
        const match = id.toLowerCase() === kw.toLowerCase();
        this.pos = saved;
        return match;
    }
    eatKeyword(kw) {
        if (this.isKeyword(kw)) {
            this.skipWhitespace();
            this.readIdentifier();
            return true;
        }
        return false;
    }
    expectKeyword(kw) {
        if (!this.eatKeyword(kw)) {
            throw new Error(`Expected keyword '${kw}' at position ${this.pos}`);
        }
    }
}
class Parser {
    constructor(sql) {
        this.paramIndex = 0;
        this.t = new Tokenizer(sql);
    }
    parse() {
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
    parseSelect() {
        const result = {
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
            const joinType = this.t.eatKeyword('JOIN') ? 'left' : 'inner';
            if (joinType === 'left') {
                this.t.eatKeyword('OUTER');
            }
            this.t.expectKeyword('JOIN');
            const table = this.t.readIdentifier();
            let alias;
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
                let dir = 'asc';
                if (this.t.eatKeyword('DESC')) {
                    dir = 'desc';
                }
                else {
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
    parseSelectColumns(distinct) {
        const cols = [];
        do {
            if (this.t.peek() === '*') {
                this.t.eat('*');
                cols.push({ expr: '*', distinct });
            }
            else {
                const expr = this.parseValueExpr();
                let alias;
                if (this.t.eatKeyword('AS')) {
                    alias = this.t.readIdentifier();
                }
                else if (!this.t.peek().match(/[,)]/) && !this.t.isKeyword('FROM') && !this.t.eof()) {
                    const ch = this.t.peek();
                    if (ch && /[a-zA-Z]/.test(ch)) {
                        alias = this.t.readIdentifier();
                    }
                }
                if (expr.kind === 'func' || expr.kind === 'column') {
                    const colExpr = expr.kind === 'func' ? `${expr.name}(${expr.args.map(a => a.kind === 'column' ? a.name : a.kind === 'literal' ? String(a.value) : '*').join(',')})` : expr.name;
                    cols.push({ expr: colExpr, alias, agg: expr.kind === 'func' ? expr.name.toLowerCase() : undefined, distinct });
                }
                else if (expr.kind === 'literal') {
                    cols.push({ expr: String(expr.value), alias, distinct });
                }
            }
        } while (this.t.eat(','));
        return cols;
    }
    parseInsert() {
        this.t.expectKeyword('INTO');
        const table = this.t.readIdentifier();
        ensureTable(table);
        this.t.expect('(');
        const columns = [];
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
    parseUpdate() {
        const table = this.t.readIdentifier();
        ensureTable(table);
        const result = { type: 'update', table, sets: [] };
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
    parseDelete() {
        this.t.expectKeyword('FROM');
        const table = this.t.readIdentifier();
        ensureTable(table);
        const result = { type: 'delete', table };
        if (this.t.eatKeyword('WHERE')) {
            result.where = this.parseWhere();
        }
        return result;
    }
    parseCreate() {
        this.t.eatKeyword('TABLE');
        this.t.eatKeyword('IF');
        this.t.eatKeyword('NOT');
        this.t.eatKeyword('EXISTS');
        const table = this.t.readIdentifier();
        ensureTable(table);
        return { type: 'create', table };
    }
    parseWhere() {
        return this.parseOr();
    }
    parseOr() {
        let left = this.parseAnd();
        while (this.t.eatKeyword('OR')) {
            const right = this.parseAnd();
            left = { kind: 'or', left, right };
        }
        return left;
    }
    parseAnd() {
        let left = this.parseCond();
        while (this.t.eatKeyword('AND')) {
            const right = this.parseCond();
            left = { kind: 'and', left, right };
        }
        return left;
    }
    parseCond() {
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
            const values = [];
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
            }
            else if (this.t.eat('>')) {
                op = '<>';
            }
            else {
                op = '<';
            }
        }
        else if (ch === '>') {
            this.t.eat('>');
            if (this.t.eat('=')) {
                op = '>=';
            }
            else {
                op = '>';
            }
        }
        else if (ch === '=') {
            this.t.eat('=');
            op = '=';
        }
        else if (ch === '!') {
            this.t.eat('!');
            this.t.expect('=');
            op = '<>';
        }
        else if (this.t.isKeyword('LIKE')) {
            this.t.eatKeyword('LIKE');
            op = 'LIKE';
        }
        const right = this.parseValueExpr();
        return { kind: 'cond', left, op, right };
    }
    parseValueExpr() {
        return this.parseBinaryExpr();
    }
    parseBinaryExpr() {
        let left = this.parsePrimaryExpr();
        while (true) {
            const ch = this.t.peek();
            if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
                const op = ch;
                this.t.eat(ch);
                const right = this.parsePrimaryExpr();
                left = { kind: 'binary', op, left, right };
            }
            else {
                break;
            }
        }
        return left;
    }
    parsePrimaryExpr() {
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
            const args = [];
            if (this.t.peek() !== ')') {
                do {
                    if (this.t.peek() === '*') {
                        this.t.eat('*');
                        args.push({ kind: 'literal', value: '*' });
                    }
                    else if (this.t.isKeyword('DISTINCT')) {
                        this.t.eatKeyword('DISTINCT');
                        args.push({ kind: 'column', name: 'DISTINCT ' + this.t.readIdentifier() });
                    }
                    else {
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
class JsonStatement {
    constructor(sql) {
        const parser = new Parser(sql);
        this.parsed = parser.parse();
    }
    run(...params) {
        const p = this.parsed;
        if (p.type === 'insert') {
            return this.doInsert(p, params);
        }
        if (p.type === 'update') {
            return this.doUpdate(p, params);
        }
        if (p.type === 'delete') {
            return this.doDelete(p, params);
        }
        if (p.type === 'create') {
            return { changes: 0, lastInsertRowid: undefined };
        }
        return { changes: 0, lastInsertRowid: undefined };
    }
    get(...params) {
        const rows = this.all(...params);
        return rows[0];
    }
    all(...params) {
        const p = this.parsed;
        if (p.type === 'select') {
            return this.doSelect(p, params);
        }
        return [];
    }
    evalValue(expr, params, row, allRows) {
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
                        if (v !== null && v !== undefined)
                            return v;
                    }
                    return null;
                }
                if (name === 'count') {
                    if (!allRows)
                        return 0;
                    if (arg.kind === 'literal' && arg.value === '*')
                        return allRows.length;
                    let colName = arg.kind === 'column' ? arg.name : '';
                    if (colName.startsWith('DISTINCT ')) {
                        colName = colName.slice(9);
                        const seen = new Set();
                        for (const r of allRows) {
                            const v = r[colName];
                            if (v !== null && v !== undefined)
                                seen.add(v);
                        }
                        return seen.size;
                    }
                    let count = 0;
                    for (const r of allRows) {
                        const v = r[colName];
                        if (v !== null && v !== undefined)
                            count++;
                    }
                    return count;
                }
                if (name === 'sum') {
                    if (!allRows)
                        return 0;
                    const colName = arg.kind === 'column' ? arg.name : '';
                    let sum = 0;
                    for (const r of allRows) {
                        const v = Number(r[colName]) || 0;
                        sum += v;
                    }
                    return sum;
                }
                if (name === 'max') {
                    if (!allRows || allRows.length === 0)
                        return 0;
                    const colName = arg.kind === 'column' ? arg.name : '';
                    let max = null;
                    for (const r of allRows) {
                        const v = r[colName];
                        if (max === null || v > max)
                            max = v;
                    }
                    return max === null ? 0 : max;
                }
                if (name === 'min') {
                    if (!allRows || allRows.length === 0)
                        return 0;
                    const colName = arg.kind === 'column' ? arg.name : '';
                    let min = null;
                    for (const r of allRows) {
                        const v = r[colName];
                        if (min === null || v < min)
                            min = v;
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
    resolveCol(col, row) {
        if (col.includes('.')) {
            const parts = col.split('.');
            return row[parts[parts.length - 1]];
        }
        return row[col];
    }
    evalWhere(node, params, row) {
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
    doInsert(p, params) {
        ensureTable(p.table);
        const row = {};
        for (let i = 0; i < p.columns.length; i++) {
            let val = params[i];
            if (val === undefined)
                val = null;
            row[p.columns[i]] = val;
        }
        collections[p.table].push(row);
        saveDb();
        return { changes: 1, lastInsertRowid: row.id };
    }
    evalUpdateValue(expr, params, row, allRows) {
        if (expr.kind === 'column') {
            return row[expr.name];
        }
        if (expr.kind === 'func') {
            const name = expr.name.toLowerCase();
            if (name === 'coalesce') {
                for (const a of expr.args) {
                    const v = this.evalUpdateValue(a, params, row, allRows);
                    if (v !== null && v !== undefined)
                        return v;
                }
                return null;
            }
            if (name === 'max') {
                const vals = expr.args.map(a => this.evalUpdateValue(a, params, row, allRows));
                let max = null;
                for (const v of vals) {
                    if (max === null || (v !== null && v !== undefined && v > max))
                        max = v;
                }
                return max === null ? 0 : max;
            }
        }
        return this.evalValue(expr, params, row, allRows);
    }
    doUpdate(p, params) {
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
        if (changes > 0)
            saveDb();
        return { changes, lastInsertRowid: undefined };
    }
    doDelete(p, params) {
        const table = collections[p.table] || [];
        if (!p.where) {
            const changes = table.length;
            collections[p.table] = [];
            if (changes > 0)
                saveDb();
            return { changes, lastInsertRowid: undefined };
        }
        const newTable = [];
        let changes = 0;
        for (const row of table) {
            if (this.evalWhere(p.where, params, row)) {
                changes++;
            }
            else {
                newTable.push(row);
            }
        }
        collections[p.table] = newTable;
        if (changes > 0)
            saveDb();
        return { changes, lastInsertRowid: undefined };
    }
    doSelect(p, params) {
        let rows = [...(collections[p.from.table] || [])];
        for (const join of p.joins) {
            const joinRows = collections[join.table] || [];
            const newRows = [];
            const leftCol = join.on.left.includes('.') ? join.on.left.split('.').pop() : join.on.left;
            const rightCol = join.on.right.includes('.') ? join.on.right.split('.').pop() : join.on.right;
            if (rows.length === 0 && join.type === 'left') {
                for (const jr of joinRows) {
                    const merged = { ...jr };
                    newRows.push(merged);
                }
            }
            else {
                for (const lr of rows) {
                    let matched = false;
                    for (const jr of joinRows) {
                        if (lr[leftCol] == jr[rightCol]) {
                            const merged = { ...lr, ...jr };
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
            rows = rows.filter(row => this.evalWhere(p.where, params, row));
        }
        let resultRows;
        const hasAgg = p.columns.some(c => c.agg);
        if (hasAgg || p.groupBy) {
            const groups = {};
            if (p.groupBy) {
                for (const row of rows) {
                    const key = p.groupBy.map(g => String(row[g] ?? '')).join('|');
                    if (!groups[key])
                        groups[key] = [];
                    groups[key].push(row);
                }
            }
            else {
                groups['*'] = rows;
            }
            resultRows = [];
            for (const key in groups) {
                const groupRows = groups[key];
                const outRow = {};
                for (const col of p.columns) {
                    if (col.expr === '*')
                        continue;
                    let val;
                    if (col.agg) {
                        const aggName = col.agg;
                        if (aggName === 'count') {
                            if (col.expr.includes('DISTINCT')) {
                                const match = col.expr.match(/DISTINCT\s+(\w+)/i);
                                if (match) {
                                    const seen = new Set();
                                    for (const r of groupRows) {
                                        const v = r[match[1]];
                                        if (v !== null && v !== undefined)
                                            seen.add(v);
                                    }
                                    val = seen.size;
                                }
                                else {
                                    val = groupRows.length;
                                }
                            }
                            else if (col.expr.includes('*')) {
                                val = groupRows.length;
                            }
                            else {
                                const match = col.expr.match(/count\((\w+)\)/i);
                                if (match) {
                                    let count = 0;
                                    for (const r of groupRows) {
                                        const v = r[match[1]];
                                        if (v !== null && v !== undefined)
                                            count++;
                                    }
                                    val = count;
                                }
                                else {
                                    val = groupRows.length;
                                }
                            }
                        }
                        else if (aggName === 'sum') {
                            const match = col.expr.match(/sum\((\w+)\)/i);
                            if (match) {
                                let sum = 0;
                                for (const r of groupRows) {
                                    sum += Number(r[match[1]]) || 0;
                                }
                                val = sum;
                            }
                            else {
                                val = 0;
                            }
                        }
                        else if (aggName === 'max') {
                            const match = col.expr.match(/max\((\w+)\)/i);
                            if (match) {
                                let m = null;
                                for (const r of groupRows) {
                                    const v = r[match[1]];
                                    if (m === null || (v !== null && v !== undefined && v > m))
                                        m = v;
                                }
                                val = m === null ? 0 : m;
                            }
                            else {
                                val = 0;
                            }
                        }
                        else if (aggName === 'min') {
                            const match = col.expr.match(/min\((\w+)\)/i);
                            if (match) {
                                let m = null;
                                for (const r of groupRows) {
                                    const v = r[match[1]];
                                    if (m === null || (v !== null && v !== undefined && v < m))
                                        m = v;
                                }
                                val = m === null ? 0 : m;
                            }
                            else {
                                val = 0;
                            }
                        }
                        else if (aggName === 'coalesce') {
                            const match = col.expr.match(/coalesce\(([^)]+)\)/i);
                            if (match) {
                                const parts = match[1].split(',').map(s => s.trim());
                                val = null;
                                for (const part of parts) {
                                    if (part === '0') {
                                        if (val === null)
                                            val = 0;
                                    }
                                    else {
                                        const sampleRow = groupRows[0] || {};
                                        const v = sampleRow[part];
                                        if (v !== null && v !== undefined) {
                                            val = v;
                                            break;
                                        }
                                    }
                                }
                                if (val === null)
                                    val = 0;
                            }
                        }
                    }
                    else {
                        const sampleRow = groupRows[0] || {};
                        val = sampleRow[col.expr];
                    }
                    const key = col.alias || col.expr;
                    outRow[key] = val;
                }
                resultRows.push(outRow);
            }
        }
        else {
            resultRows = rows.map(row => {
                if (p.columns.length === 1 && p.columns[0].expr === '*') {
                    return { ...row };
                }
                const out = {};
                for (const col of p.columns) {
                    if (col.expr === '*')
                        continue;
                    let val;
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
                                        if (val === null)
                                            val = 0;
                                    }
                                    else {
                                        const v = row[part];
                                        if (v !== null && v !== undefined) {
                                            val = v;
                                            break;
                                        }
                                    }
                                }
                                if (val === null)
                                    val = null;
                            }
                            else {
                                val = row[col.expr];
                            }
                        }
                        else {
                            val = row[col.expr];
                        }
                    }
                    else {
                        val = row[col.expr];
                    }
                    const key = col.alias || col.expr;
                    out[key] = val;
                }
                return out;
            });
        }
        if (p.columns.length > 0 && p.columns[0].distinct && !hasAgg) {
            const seen = new Set();
            const deduped = [];
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
                for (const ob of p.orderBy) {
                    let av = a[ob.col];
                    let bv = b[ob.col];
                    if (av === undefined || av === null)
                        av = '';
                    if (bv === undefined || bv === null)
                        bv = '';
                    let cmp = 0;
                    if (typeof av === 'number' && typeof bv === 'number') {
                        cmp = av - bv;
                    }
                    else {
                        cmp = String(av).localeCompare(String(bv));
                    }
                    if (ob.dir === 'desc')
                        cmp = -cmp;
                    if (cmp !== 0)
                        return cmp;
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
const db = {
    pragma(_sql) {
        return db;
    },
    exec(sql) {
        const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
        for (const stmt of stmts) {
            try {
                const s = new JsonStatement(stmt);
                s.run();
            }
            catch {
            }
        }
    },
    prepare(sql) {
        return new JsonStatement(sql);
    },
    transaction(fn) {
        return function () {
            return fn();
        };
    },
};
exports.default = db;
