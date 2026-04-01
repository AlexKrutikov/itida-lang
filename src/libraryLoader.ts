import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// ========================= INTERFACES =========================

export interface LibraryInfo {
    libname: string;
    libalias: string;
    libsystem: boolean;
    libencrypted: boolean;
    dirPath: string;
}

export interface LibraryFunction {
    name: string;
    description: string;
    note: string;
    isLocal: boolean;
    groupname: string;
    library: LibraryInfo;
    /** Parsed parameter names from description */
    params: string[];
    /** Signature: ALIAS.Name(params) */
    signature: string;
    /** Path to the .txt source file (if exists) */
    sourceFile?: string;
}

// ========================= PARSING =========================

function parseParamsFromDescription(description: string): string[] {
    const match = description.match(/\(([^)]*)\)/);
    if (!match || !match[1].trim()) { return []; }
    return match[1].split(',').map(p => p.trim()).filter(p => p.length > 0);
}


/** Generate JSON metadata object for a function */
export function generateFunctionJson(name: string, params: string[], groupname: string = '', isLocal: boolean = false): object {
    return {
        name,
        description: `${name}(${params.join(', ')})`,
        note: '',
        isLocal,
        groupname
    };
}

function tryReadJson(filePath: string): any | undefined {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return undefined;
    }
}

// ========================= LOADER =========================

export class LibraryStore {
    private _libraries: LibraryInfo[] = [];
    private _functions: LibraryFunction[] = [];
    /** alias (lowercase) -> LibraryInfo */
    private _aliasByLower: Map<string, LibraryInfo> = new Map();
    /** alias (lowercase) -> functions */
    private _functionsByAlias: Map<string, LibraryFunction[]> = new Map();
    /** funcName (lowercase) -> LibraryFunction[] (may exist in multiple libs) */
    private _functionsByName: Map<string, LibraryFunction[]> = new Map();

    get libraries(): readonly LibraryInfo[] { return this._libraries; }
    get functions(): readonly LibraryFunction[] { return this._functions; }

    getLibraryByAlias(alias: string): LibraryInfo | undefined {
        return this._aliasByLower.get(alias.toLowerCase());
    }

    getFunctionsByAlias(alias: string): LibraryFunction[] {
        return this._functionsByAlias.get(alias.toLowerCase()) ?? [];
    }

    getFunctionByFullName(alias: string, funcName: string): LibraryFunction | undefined {
        const funcs = this.getFunctionsByAlias(alias);
        const lower = funcName.toLowerCase();
        return funcs.find(f => f.name.toLowerCase() === lower);
    }

    getFunctionsByName(funcName: string): LibraryFunction[] {
        return this._functionsByName.get(funcName.toLowerCase()) ?? [];
    }

    get isEmpty(): boolean { return this._functions.length === 0; }

    clear(): void {
        this._libraries = [];
        this._functions = [];
        this._aliasByLower.clear();
        this._functionsByAlias.clear();
        this._functionsByName.clear();
    }

    load(rootPath: string): number {
        this.clear();

        if (!rootPath || !fs.existsSync(rootPath)) { return 0; }

        this.scanDirectory(rootPath, rootPath);

        return this._functions.length;
    }

    private scanDirectory(dir: string, rootPath: string): void {
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        // Check if this directory has an index.json (it's a library root)
        const indexPath = path.join(dir, 'index.json');
        const indexData = tryReadJson(indexPath);
        let library: LibraryInfo | undefined;

        if (indexData && indexData.libalias) {
            library = {
                libname: indexData.libname || '',
                libalias: indexData.libalias,
                libsystem: indexData.libsystem ?? false,
                libencrypted: indexData.libencrypted ?? false,
                dirPath: dir,
            };
            this._libraries.push(library);
            this._aliasByLower.set(library.libalias.toLowerCase(), library);
            if (!this._functionsByAlias.has(library.libalias.toLowerCase())) {
                this._functionsByAlias.set(library.libalias.toLowerCase(), []);
            }
        }

        // Recurse into subdirectories
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                this.scanDirectory(path.join(dir, entry.name), rootPath);
            }
        }

        // Find function JSON files in this directory (not index.json)
        // A function exists if there's a .json file with a matching .txt file
        if (!library) {
            // Find the nearest parent library
            library = this.findParentLibrary(dir, rootPath);
        }
        if (!library) { return; }

        for (const entry of entries) {
            if (!entry.isFile() || entry.name === 'index.json' || !entry.name.endsWith('.json')) {
                continue;
            }

            const jsonPath = path.join(dir, entry.name);
            const funcData = tryReadJson(jsonPath);
            if (!funcData || !funcData.name) { continue; }

            const params = parseParamsFromDescription(funcData.description || '');
            const signature = `${library.libalias}.${funcData.name}(${params.join(', ')})`;

            // Check for corresponding .txt source file
            const baseName = entry.name.replace(/\.json$/, '');
            const txtPath = path.join(dir, baseName + '.txt');
            const sourceFile = fs.existsSync(txtPath) ? txtPath : undefined;

            const func: LibraryFunction = {
                name: funcData.name,
                description: funcData.description || '',
                note: funcData.note || '',
                isLocal: funcData.isLocal ?? false,
                groupname: funcData.groupname || '',
                library,
                params,
                signature,
                sourceFile,
            };

            this._functions.push(func);

            // Index by alias
            const aliasLower = library.libalias.toLowerCase();
            let byAlias = this._functionsByAlias.get(aliasLower);
            if (!byAlias) {
                byAlias = [];
                this._functionsByAlias.set(aliasLower, byAlias);
            }
            byAlias.push(func);

            // Index by function name
            const nameLower = func.name.toLowerCase();
            let byName = this._functionsByName.get(nameLower);
            if (!byName) {
                byName = [];
                this._functionsByName.set(nameLower, byName);
            }
            byName.push(func);
        }

    }

    private findParentLibrary(dir: string, rootPath: string): LibraryInfo | undefined {
        let current = dir;
        while (current !== rootPath && current !== path.dirname(current)) {
            // Check if any library has this dirPath
            for (const lib of this._libraries) {
                if (current === lib.dirPath) {
                    return lib;
                }
            }
            current = path.dirname(current);
        }
        return undefined;
    }
}
