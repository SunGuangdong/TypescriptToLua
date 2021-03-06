import * as path from "path";
import * as ts from "typescript";

import { Expect } from "alsatian";

import { transpileString } from "../../src/Compiler";
import { LuaTarget, LuaTranspiler } from "../../src/Transpiler";
import { createTranspiler } from "../../src/TranspilerFactory";

import {lauxlib, lua, lualib, to_jsstring, to_luastring } from "fengari";

import * as fs from "fs";

export { transpileString };

export function executeLua(luaStr: string, withLib = true): any {
    if (withLib) {
        luaStr = minimalTestLib + luaStr;
    }

    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);
    const status = lauxlib.luaL_dostring(L, to_luastring(luaStr));

    if (status === lua.LUA_OK) {
        // Read the return value from stack depending on its type.
        if (lua.lua_isboolean(L, -1)) {
            return lua.lua_toboolean(L, -1);
        } else if (lua.lua_isnil(L, -1)) {
            return null;
        } else if (lua.lua_isnumber(L, -1)) {
            return lua.lua_tonumber(L, -1);
        } else if (lua.lua_isstring(L, -1)) {
            return lua.lua_tojsstring(L, -1);
        } else {
            throw new Error("Unsupported lua return type: " + to_jsstring(lua.lua_typename(L, lua.lua_type(L, -1))));
        }
    } else {
        // If the lua VM did not terminate with status code LUA_OK an error occurred.
        // Throw a JS error with the message, retrieved by reading a string from the stack.

        // Filter control characters out of string which are in there because ????
        throw new Error("LUA ERROR: " + to_jsstring(lua.lua_tostring(L, -1).filter(c => c >= 20)));
    }
}

export function expectCodeEqual(code1: string, code2: string): void {
    // Trim leading/trailing whitespace
    let c1 = code1.trim();
    let c2 = code2.trim();

    // Unify indentation
    c1 = c1.replace(/\s+/g, " ");
    c2 = c2.replace(/\s+/g, " ");

    Expect(c1).toBe(c2);
}

// Get a mock transpiler to use for testing
export function makeTestTranspiler(target: LuaTarget = LuaTarget.Lua53): LuaTranspiler {
    return createTranspiler({} as ts.TypeChecker,
                            { luaLibImport: "none", luaTarget: target } as any,
                            { statements: [] } as any as ts.SourceFile);
}

export function transpileAndExecute(tsStr: string): any {
    return executeLua(transpileString(tsStr));
}

const jsonlib = fs.readFileSync("test/src/json.lua") + "\n";

export const minimalTestLib = jsonlib;
