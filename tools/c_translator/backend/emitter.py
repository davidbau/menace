import json
import re
from pathlib import Path

from async_infer import build_async_summary
from cfg import build_cfg_summary
from frontend import all_function_ast_summaries, function_ast_summary
from nir import build_nir_snapshot


FUNC_SIG_LINE_RE = re.compile(r"^\s*([A-Za-z_]\w*)\s*\(([^)]*)\)\s*$")
IDENT_RE = re.compile(r"[A-Za-z_]\w*$")
JS_RESERVED_IDENTS = {
    "class",
    "let",
    "in",
    "default",
    "function",
    "return",
    "switch",
    "case",
    "new",
}
DECL_RE = re.compile(
    r"^(?:unsigned\s+)?(?:int|long|short|boolean|coordxy|schar|uchar)\s+(.+);$"
)
DECL_FALLBACK_RE = re.compile(
    r"^(?:(?:const|volatile|register|static|extern|signed|unsigned|short|long|"
    r"int|char|float|double|boolean|coordxy|coord|schar|uchar|xint16|xint32|xint64|"
    r"struct\s+[A-Za-z_]\w*|enum\s+[A-Za-z_]\w*|union\s+[A-Za-z_]\w*|"
    r"[A-Za-z_]\w*)\s+)+(.+);$"
)
PANIC_RE = re.compile(r'^panic\("([^"]+)"\)$')
C_BLOCK_COMMENT_RE = re.compile(r"/\*.*?\*/")


def _extract_param_names(signature_line):
    m = FUNC_SIG_LINE_RE.match(signature_line.strip())
    if not m:
        return []
    arg_src = m.group(2).strip()
    if not arg_src or arg_src == "void":
        return []
    names = []
    for raw in arg_src.split(","):
        token = raw.strip()
        if token == "...":
            names.append("varargs")
            continue
        ident = IDENT_RE.search(token)
        if ident:
            names.append(_sanitize_ident(ident.group(0)))
        else:
            names.append("arg")
    return names


def _sanitize_ident(name):
    if name in JS_RESERVED_IDENTS:
        return f"{name}_"
    return name


def _normalize_runtime_param_order(params):
    if not params:
        return params
    # Preserve source/AST order, but stabilize the common wrapper mismatch
    # where generated helpers produce "(display, game)" and runtime exports
    # expect "(game, display)".
    out = list(params)
    if "game" in out and "display" in out:
        ig = out.index("game")
        idisp = out.index("display")
        if ig > idisp:
            out[idisp], out[ig] = out[ig], out[idisp]
    return out


def emit_helper_scaffold(src_path, func_name, compile_profile=None):
    if not func_name:
        raise ValueError("--func is required for emit-helper mode")

    path = Path(src_path)
    text = path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()

    nir = build_nir_snapshot(src_path, func_name)
    if nir["function_count"] != 1:
        raise ValueError(
            f"emit-helper requires exactly one function match, found {nir['function_count']} for {func_name}"
        )
    fn = nir["functions"][0]
    cfg = build_cfg_summary(src_path, func_name)["functions"][0]["cfg"]
    sig_line = lines[fn["span"]["signature_line"] - 1]
    params = _extract_param_names(sig_line)
    ast_summary = None
    translated = False
    lower_diags = []
    required_params = set()
    rewrite_rules = _load_rewrite_rules()
    async_info = _load_async_info(src_path, fn["name"])
    requires_async = async_info["requires_async"]
    awaitable_calls = async_info["awaitable_calls"]
    if compile_profile is not None:
        ast_summary = function_ast_summary(src_path, compile_profile, fn["name"])
    if ast_summary and ast_summary.get("available"):
        translated_lines, lower_diags, required_params = _translate_ast_compound(
            ast_summary["compound"],
            1,
            rewrite_rules,
            awaitable_calls,
        )
        if translated_lines is not None:
            params = ast_summary.get("params") or params
            params = [_sanitize_ident(p) for p in params]
            for p in sorted(required_params):
                if p not in params:
                    params.append(p)
            params = _normalize_runtime_param_order(params)
            translated = True

    func_decl = "export async function" if requires_async else "export function"
    if translated:
        js_lines = [
            f"// Autotranslated from {path.name}:{fn['span']['signature_line']}",
            f"{func_decl} {fn['name']}({', '.join(params)}) {{",
            *translated_lines,
            "}",
        ]
    else:
        js_lines = [
            f"// Autotranslated from {path.name}:{fn['span']['signature_line']}",
            f"{func_decl} {fn['name']}({', '.join(params)}) {{",
            "  // TODO(iron-parity): translated body pending pass pipeline.",
            '  throw new Error("UNIMPLEMENTED_TRANSLATED_FUNCTION");',
            "}",
        ]

    diags = []
    diags.extend(lower_diags)
    if cfg["goto_count"] > 0 or cfg["label_count"] > 0:
        diags.append(
            {
                "severity": "warning",
                "code": "CFG_COMPLEXITY",
                "message": "Function has labels/gotos; helper scaffold is non-semantic placeholder.",
            }
        )
    if ast_summary and not ast_summary.get("available"):
        diags.append(
            {
                "severity": "warning",
                "code": "CLANG_AST_UNAVAILABLE",
                "message": ast_summary.get("reason", "unknown clang AST failure"),
            }
        )
    if not translated:
        diags.append(
            {
                "severity": "warning",
                "code": "PLACEHOLDER_BODY",
                "message": "Function body emitted as placeholder scaffold.",
            }
        )
    if "varargs" in params:
        diags.append(
            {
                "severity": "warning",
                "code": "VARARGS_APPROX",
                "message": "Varargs parameter approximated as `varargs`.",
            }
        )

    return {
        "emit_mode": "emit-helper",
        "source": str(path).replace("\\", "/"),
        "function": fn["name"],
        "js": "\n".join(js_lines) + "\n",
        "meta": {
            "signature_line": fn["span"]["signature_line"],
            "body_start_line": fn["span"]["body_start_line"],
            "body_end_line": fn["span"]["body_end_line"],
            "body_sha256": fn["body_sha256"],
            "param_names": params,
            "call_count": len(fn["calls"]),
            "assignment_count": len(fn["assignments"]),
            "cfg_tags": cfg["reducible_tags"],
            "translated": translated,
            "requires_async": requires_async,
            "awaitable_calls": sorted(awaitable_calls),
        },
        "diag": diags,
    }


def emit_capability_summary(src_path, compile_profile=None):
    nir = build_nir_snapshot(src_path)
    functions = []
    translated_count = 0
    blocked_count = 0
    diag_hist = {}
    rewrite_rules = _load_rewrite_rules()

    async_summary = build_async_summary(src_path)
    async_map = {}
    for fn in async_summary.get("functions", []):
        direct = set(fn.get("direct_awaited_boundaries", []))
        async_callees = set(fn.get("awaited_boundary_callsites", []))
        async_map[fn.get("name")] = {
            "requires_async": bool(fn.get("requires_async")),
            "awaitable_calls": direct | async_callees,
        }

    ast_index = {}
    ast_status = {"available": False, "reason": "compile profile unavailable"}
    if compile_profile is not None:
        ast_status = all_function_ast_summaries(src_path, compile_profile)
    if ast_status.get("available"):
        for fn in ast_status.get("functions", []):
            key = (fn.get("name"), fn.get("signature_line"))
            ast_index[key] = fn

    for fn in nir.get("functions", []):
        name = fn.get("name")
        sig = fn.get("span", {}).get("signature_line")
        info = async_map.get(name) or {"requires_async": False, "awaitable_calls": set()}
        ast_fn = ast_index.get((name, sig))
        diags = []
        translated = False

        if ast_fn:
            translated_lines, lower_diags, _required_params = _translate_ast_compound(
                ast_fn.get("compound"),
                1,
                rewrite_rules,
                info["awaitable_calls"],
            )
            diags.extend(lower_diags)
            translated = translated_lines is not None
            if not translated:
                diags.append(
                    {
                        "severity": "warning",
                        "code": "PLACEHOLDER_BODY",
                        "message": "Function body emitted as placeholder scaffold.",
                    }
                )
        else:
            if ast_status.get("available"):
                diags.append(
                    {
                        "severity": "warning",
                        "code": "CLANG_AST_UNAVAILABLE",
                        "message": f"function not found: {name}@{sig}",
                    }
                )
            else:
                diags.append(
                    {
                        "severity": "warning",
                        "code": "CLANG_AST_UNAVAILABLE",
                        "message": ast_status.get("reason", "unknown clang AST failure"),
                    }
                )
            diags.append(
                {
                    "severity": "warning",
                    "code": "PLACEHOLDER_BODY",
                    "message": "Function body emitted as placeholder scaffold.",
                }
            )

        payload = {
            "meta": {
                "translated": translated,
                "signature_line": sig,
            },
            "diag": diags,
        }
        translated = bool(payload.get("meta", {}).get("translated"))
        if translated:
            translated_count += 1
        else:
            blocked_count += 1
        diag_codes = [d.get("code") for d in (payload.get("diag") or []) if d.get("code")]
        for code in diag_codes:
            diag_hist[code] = diag_hist.get(code, 0) + 1
        functions.append(
            {
                "name": name,
                "signature_line": payload.get("meta", {}).get("signature_line"),
                "translated": translated,
                "diag_codes": diag_codes,
                "diag": payload.get("diag") or [],
            }
        )

    return {
        "emit_mode": "capability-summary",
        "source": str(Path(src_path)).replace("\\", "/"),
        "function_count": len(functions),
        "translated_count": translated_count,
        "blocked_count": blocked_count,
        "diag_histogram": dict(sorted(diag_hist.items(), key=lambda kv: kv[0])),
        "functions": functions,
    }


def _translate_ast_compound(compound_stmt, base_indent, rewrite_rules, awaitable_calls):
    if not isinstance(compound_stmt, dict) or compound_stmt.get("kind") != "COMPOUND_STMT":
        return None, [_diag("UNSUPPORTED_TOPLEVEL", "Expected COMPOUND_STMT for function body")], set()

    out = []
    diags = []
    required_params = set()
    for child in compound_stmt.get("children", []):
        lines, child_diags, child_required = _translate_stmt(
            child,
            base_indent,
            rewrite_rules,
            awaitable_calls,
        )
        diags.extend(child_diags)
        if lines is None:
            return None, diags, required_params
        out.extend(lines)
        required_params.update(child_required)
    out = _merge_adjacent_let_lines(out)
    unresolved = _find_unresolved_tokens(out)
    if unresolved:
        diags.append(
            _diag(
                "UNRESOLVED_C_TOKENS",
                f"Unresolved C tokens after rewrite: {', '.join(sorted(unresolved))}",
            )
        )
        return None, diags, required_params
    legacy_tokens = _find_legacy_js_tokens(out)
    if legacy_tokens:
        diags.append(
            _diag(
                "LEGACY_JS_TARGETS",
                f"Generated output used legacy JS paths: {', '.join(sorted(legacy_tokens))}",
            )
        )
        return None, diags, required_params
    return out, diags, required_params


def _translate_stmt(stmt, indent, rewrite_rules, awaitable_calls):
    kind = stmt.get("kind")
    text = _normalize_space(stmt.get("text", ""))
    children = stmt.get("children", [])
    pad = "  " * indent

    if kind == "DECL_STMT":
        lowered, req = _lower_decl_stmt(text, rewrite_rules)
        if lowered is None:
            return None, [_diag("UNSUPPORTED_DECL_STMT", text)], set()
        return [pad + lowered], [], req

    if kind == "IF_STMT":
        return _translate_if_stmt(stmt, indent, rewrite_rules, awaitable_calls)

    if kind == "FOR_STMT":
        return _translate_for_stmt(stmt, indent, rewrite_rules, awaitable_calls)

    if kind == "WHILE_STMT":
        return _translate_while_stmt(stmt, indent, rewrite_rules, awaitable_calls)

    if kind == "DO_STMT":
        return _translate_do_stmt(stmt, indent, rewrite_rules, awaitable_calls)

    if kind == "SWITCH_STMT":
        return _translate_switch_stmt(stmt, indent, rewrite_rules, awaitable_calls)

    if kind == "CASE_STMT":
        return _translate_case_stmt(stmt, indent, rewrite_rules, awaitable_calls)

    if kind == "DEFAULT_STMT":
        return _translate_default_stmt(stmt, indent, rewrite_rules, awaitable_calls)

    if kind == "COMPOUND_STMT":
        out = []
        diags = []
        required_params = set()
        for child in children:
            lines, child_diags, child_required = _translate_stmt(
                child,
                indent,
                rewrite_rules,
                awaitable_calls,
            )
            diags.extend(child_diags)
            if lines is None:
                return None, diags, required_params
            out.extend(lines)
            required_params.update(child_required)
        return out, diags, required_params

    if kind in {"BINARY_OPERATOR", "UNARY_OPERATOR", "RETURN_STMT", "CALL_EXPR"}:
        lowered, req = _lower_expr_stmt(text, rewrite_rules, awaitable_calls)
        if lowered is None:
            return None, [_diag("UNSUPPORTED_EXPR_STMT", text)], set()
        return [pad + lowered], [], req

    if kind in {"CSTYLE_CAST_EXPR", "COMPOUND_ASSIGNMENT_OPERATOR"}:
        lowered, req = _lower_expr_stmt(text, rewrite_rules, awaitable_calls)
        if lowered is None:
            return None, [_diag("UNSUPPORTED_EXPR_STMT", text)], set()
        return [pad + lowered], [], req

    if kind == "PAREN_EXPR":
        lowered, req = _lower_expr_stmt(text, rewrite_rules, awaitable_calls)
        if lowered is None:
            return None, [_diag("UNSUPPORTED_EXPR_STMT", text)], set()
        return [pad + lowered], [], req

    if kind == "UNEXPOSED_STMT":
        if children:
            # Clang frequently wraps recoverable statements in UNEXPOSED_STMT.
            # Peel and translate child nodes rather than hard-failing.
            return _translate_stmt(children[0], indent, rewrite_rules, awaitable_calls)
        lowered, req = _lower_expr_stmt(text, rewrite_rules, awaitable_calls)
        if lowered is None:
            return None, [_diag("UNSUPPORTED_STMT_KIND", kind)], set()
        return [pad + lowered], [], req

    if kind == "CONTINUE_STMT":
        return [pad + "continue;"], [], set()

    if kind == "BREAK_STMT":
        return [pad + "break;"], [], set()

    if kind == "NULL_STMT":
        return [], [], set()

    return None, [_diag("UNSUPPORTED_STMT_KIND", kind)], set()


def _translate_stmt_as_block(stmt, indent, rewrite_rules, awaitable_calls):
    kind = stmt.get("kind")
    if kind == "COMPOUND_STMT":
        return _translate_stmt(stmt, indent, rewrite_rules, awaitable_calls)
    return _translate_stmt(stmt, indent, rewrite_rules, awaitable_calls)


def _translate_if_stmt(stmt, indent, rewrite_rules, awaitable_calls):
    children = stmt.get("children", [])
    pad = "  " * indent
    if len(children) < 2:
        return None, [_diag("BAD_IF_AST", _normalize_space(stmt.get("text", "")))], set()

    cond, cond_req = _lower_expr(_normalize_space(children[0].get("text", "")), rewrite_rules)
    if cond is None:
        return None, [_diag("BAD_IF_COND", _normalize_space(stmt.get("text", "")))], set()

    out = []
    diags = []
    required_params = set(cond_req)

    then_stmt = children[1]
    then_lines, then_diags, then_req = _translate_stmt_as_block(
        then_stmt,
        indent + 1,
        rewrite_rules,
        awaitable_calls,
    )
    if then_lines is None:
        return None, then_diags, required_params
    diags.extend(then_diags)
    required_params.update(then_req)

    if _can_inline_if_body(then_stmt, then_lines):
        out.append(f"{pad}if ({cond}) {then_lines[0].strip()}")
    elif _can_inline_compact_block(then_stmt, then_lines):
        compact = _compact_block_line(then_lines)
        out.append(f"{pad}if ({cond}) {{ {compact} }}")
    else:
        out.append(f"{pad}if ({cond}) {{")
        out.extend(then_lines)
        out.append(f"{pad}}}")

    if len(children) >= 3:
        else_stmt = children[2]
        if else_stmt.get("kind") == "IF_STMT":
            else_lines, else_diags, else_req = _translate_if_stmt(
                else_stmt,
                indent,
                rewrite_rules,
                awaitable_calls,
            )
            if else_lines is None:
                return None, else_diags, required_params
            diags.extend(else_diags)
            required_params.update(else_req)
            if not else_lines:
                return out, diags, required_params
            first = else_lines[0].lstrip()
            out.append(f"{pad}else {first}")
            out.extend(else_lines[1:])
        else:
            else_lines, else_diags, else_req = _translate_stmt_as_block(
                else_stmt,
                indent + 1,
                rewrite_rules,
                awaitable_calls,
            )
            if else_lines is None:
                return None, else_diags, required_params
            diags.extend(else_diags)
            required_params.update(else_req)
            if _can_inline_compact_block(else_stmt, else_lines):
                compact = _compact_block_line(else_lines)
                out.append(f"{pad}else {{ {compact} }}")
            else:
                out.append(f"{pad}else {{")
                out.extend(else_lines)
                out.append(f"{pad}}}")

    return out, diags, required_params


def _can_inline_if_body(stmt, lines):
    if not lines or len(lines) != 1:
        return False
    kind = stmt.get("kind")
    return kind in {"BINARY_OPERATOR", "UNARY_OPERATOR", "RETURN_STMT", "CALL_EXPR"}


def _can_inline_compact_block(stmt, lines):
    if stmt.get("kind") != "COMPOUND_STMT":
        return False
    if not lines or len(lines) > 2:
        return False
    total_len = 0
    for line in lines:
        token = line.strip()
        if not token or "{" in token or "}" in token:
            return False
        if len(token) > 48:
            return False
        total_len += len(token)
    return total_len <= 72


def _compact_block_line(lines):
    return " ".join(line.strip() for line in lines)


def _merge_adjacent_let_lines(lines):
    merged = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not _is_let_line(line):
            merged.append(line)
            i += 1
            continue

        indent = line[: len(line) - len(line.lstrip())]
        decls = [_let_payload(line)]
        j = i + 1
        while j < len(lines) and _is_let_line(lines[j]):
            next_indent = lines[j][: len(lines[j]) - len(lines[j].lstrip())]
            if next_indent != indent:
                break
            candidate = decls + [_let_payload(lines[j])]
            combined = ", ".join(candidate)
            if len(combined) > 72:
                break
            decls.append(_let_payload(lines[j]))
            j += 1

        merged.append(f"{indent}let {', '.join(decls)};")
        i = j
    return merged


def _is_let_line(line):
    s = line.lstrip()
    return s.startswith("let ") and s.endswith(";")


def _let_payload(line):
    s = line.strip()
    return s[len("let ") : -1].strip()


def _lower_decl_stmt(text, rewrite_rules):
    text = C_BLOCK_COMMENT_RE.sub(" ", text)
    m = DECL_RE.match(text)
    if not m:
        m = DECL_FALLBACK_RE.match(text)
    if not m:
        return None, set()
    # Remember if this is a char array declaration so declarators like foo[N]
    # can be initialized to '' instead of left undefined.
    is_char_array_decl = bool(re.match(r"^(?:const\s+)?char\s+\w+\s*\[", text.strip()))
    decl = m.group(m.lastindex)
    lowered = []
    req = set()
    for raw in _split_top_level_commas(decl):
        token = raw.strip()
        if not token:
            return None, set()
        if "=" in token:
            lhs, rhs = token.split("=", 1)
            lhs = lhs.strip()
            lhs_name = _extract_decl_name(lhs)
            if lhs_name is None:
                return None, set()
            rhs, rhs_req = _lower_expr(rhs.strip(), rewrite_rules)
            if rhs is None:
                return None, set()
            req.update(rhs_req)
            if rhs.startswith("{") and rhs.endswith("}"):
                rhs = rhs.replace("{", "[").replace("}", "]")
            lowered.append(f"{lhs_name} = {rhs}")
        else:
            lhs_name = _extract_decl_name(token)
            if lhs_name is None:
                return None, set()
            # char foo[N] declarations are string buffers; initialize to '' in JS.
            if is_char_array_decl and re.search(r"\[", token):
                lowered.append(f"{lhs_name} = ''")
            else:
                lowered.append(lhs_name)
    return f"let {', '.join(lowered)};", req


def _split_top_level_commas(text):
    parts = []
    cur = []
    depth_paren = 0
    depth_brace = 0
    depth_bracket = 0
    for ch in text:
        if ch == "," and depth_paren == 0 and depth_brace == 0 and depth_bracket == 0:
            parts.append("".join(cur).strip())
            cur = []
            continue
        cur.append(ch)
        if ch == "(":
            depth_paren += 1
        elif ch == ")":
            depth_paren = max(0, depth_paren - 1)
        elif ch == "{":
            depth_brace += 1
        elif ch == "}":
            depth_brace = max(0, depth_brace - 1)
        elif ch == "[":
            depth_bracket += 1
        elif ch == "]":
            depth_bracket = max(0, depth_bracket - 1)
    tail = "".join(cur).strip()
    if tail:
        parts.append(tail)
    return parts


def _translate_for_stmt(stmt, indent, rewrite_rules, awaitable_calls):
    children = stmt.get("children", [])
    pad = "  " * indent
    if not children:
        return None, [_diag("BAD_FOR_AST", _normalize_space(stmt.get("text", "")))], set()

    body_stmt = children[-1]
    parts = children[:-1]
    init = ""
    cond = ""
    inc = ""
    required_params = set()

    if len(parts) >= 1:
        init_stmt = parts[0]
        if init_stmt.get("kind") == "DECL_STMT":
            lowered, req = _lower_decl_stmt(_normalize_space(init_stmt.get("text", "")), rewrite_rules)
            if lowered is None:
                return None, [_diag("BAD_FOR_INIT", _normalize_space(init_stmt.get("text", "")))], set()
            init = lowered[:-1] if lowered.endswith(";") else lowered
            required_params.update(req)
        else:
            lowered, req = _lower_expr(_normalize_space(init_stmt.get("text", "")), rewrite_rules)
            if lowered is None:
                return None, [_diag("BAD_FOR_INIT", _normalize_space(init_stmt.get("text", "")))], set()
            init = lowered
            required_params.update(req)
    if len(parts) >= 2:
        lowered, req = _lower_expr(_normalize_space(parts[1].get("text", "")), rewrite_rules)
        if lowered is None:
            return None, [_diag("BAD_FOR_COND", _normalize_space(parts[1].get("text", "")))], set()
        cond = lowered
        required_params.update(req)
    if len(parts) >= 3:
        lowered, req = _lower_expr(_normalize_space(parts[2].get("text", "")), rewrite_rules)
        if lowered is None:
            return None, [_diag("BAD_FOR_INC", _normalize_space(parts[2].get("text", "")))], set()
        inc = lowered
        required_params.update(req)

    body_lines, body_diags, body_req = _translate_stmt_as_block(
        body_stmt,
        indent + 1,
        rewrite_rules,
        awaitable_calls,
    )
    if body_lines is None:
        return None, body_diags, required_params
    required_params.update(body_req)

    out = [f"{pad}for ({init}; {cond}; {inc}) {{"]
    out.extend(body_lines)
    out.append(f"{pad}}}")
    return out, body_diags, required_params


def _translate_while_stmt(stmt, indent, rewrite_rules, awaitable_calls):
    children = stmt.get("children", [])
    pad = "  " * indent
    if len(children) < 2:
        return None, [_diag("BAD_WHILE_AST", _normalize_space(stmt.get("text", "")))], set()

    cond, cond_req = _lower_expr(_normalize_space(children[0].get("text", "")), rewrite_rules)
    if cond is None:
        return None, [_diag("BAD_WHILE_COND", _normalize_space(children[0].get("text", "")))], set()

    body_lines, body_diags, body_req = _translate_stmt_as_block(
        children[1],
        indent + 1,
        rewrite_rules,
        awaitable_calls,
    )
    if body_lines is None:
        return None, body_diags, cond_req

    req = set(cond_req)
    req.update(body_req)
    out = [f"{pad}while ({cond}) {{"]
    out.extend(body_lines)
    out.append(f"{pad}}}")
    return out, body_diags, req


def _translate_do_stmt(stmt, indent, rewrite_rules, awaitable_calls):
    children = stmt.get("children", [])
    pad = "  " * indent
    if len(children) < 2:
        return None, [_diag("BAD_DO_AST", _normalize_space(stmt.get("text", "")))], set()

    body_lines, body_diags, body_req = _translate_stmt_as_block(
        children[0],
        indent + 1,
        rewrite_rules,
        awaitable_calls,
    )
    if body_lines is None:
        return None, body_diags, set()
    cond, cond_req = _lower_expr(_normalize_space(children[1].get("text", "")), rewrite_rules)
    if cond is None:
        return None, [_diag("BAD_DO_COND", _normalize_space(children[1].get("text", "")))], set()

    req = set(body_req)
    req.update(cond_req)
    out = [f"{pad}do {{"]
    out.extend(body_lines)
    out.append(f"{pad}}} while ({cond});")
    return out, body_diags, req


def _translate_switch_stmt(stmt, indent, rewrite_rules, awaitable_calls):
    children = stmt.get("children", [])
    pad = "  " * indent
    if len(children) < 2:
        return None, [_diag("BAD_SWITCH_AST", _normalize_space(stmt.get("text", "")))], set()

    cond, cond_req = _lower_expr(_normalize_space(children[0].get("text", "")), rewrite_rules)
    if cond is None:
        return None, [_diag("BAD_SWITCH_COND", _normalize_space(children[0].get("text", "")))], set()
    body_lines, body_diags, body_req = _translate_stmt_as_block(
        children[1],
        indent + 1,
        rewrite_rules,
        awaitable_calls,
    )
    if body_lines is None:
        return None, body_diags, cond_req

    req = set(cond_req)
    req.update(body_req)
    out = [f"{pad}switch ({cond}) {{"]
    out.extend(body_lines)
    out.append(f"{pad}}}")
    return out, body_diags, req


def _translate_case_stmt(stmt, indent, rewrite_rules, awaitable_calls):
    children = stmt.get("children", [])
    pad = "  " * indent
    if not children:
        return None, [_diag("BAD_CASE_AST", _normalize_space(stmt.get("text", "")))], set()
    label, label_req = _lower_expr(_normalize_space(children[0].get("text", "")), rewrite_rules)
    if label is None:
        return None, [_diag("BAD_CASE_LABEL", _normalize_space(children[0].get("text", "")))], set()

    out = [f"{pad}case {label}:"]
    diags = []
    req = set(label_req)
    for child in children[1:]:
        lines, child_diags, child_req = _translate_stmt(
            child,
            indent + 1,
            rewrite_rules,
            awaitable_calls,
        )
        diags.extend(child_diags)
        if lines is None:
            return None, diags, req
        out.extend(lines)
        req.update(child_req)
    return out, diags, req


def _translate_default_stmt(stmt, indent, rewrite_rules, awaitable_calls):
    children = stmt.get("children", [])
    pad = "  " * indent
    out = [f"{pad}default:"]
    diags = []
    req = set()
    for child in children:
        lines, child_diags, child_req = _translate_stmt(
            child,
            indent + 1,
            rewrite_rules,
            awaitable_calls,
        )
        diags.extend(child_diags)
        if lines is None:
            return None, diags, req
        out.extend(lines)
        req.update(child_req)
    return out, diags, req


def _lower_expr_stmt(text, rewrite_rules, awaitable_calls):
    t = text.rstrip(";").strip()
    if not t:
        return None, set()
    # Strip implicit C (void) cast that clang inserts when discarding a return value.
    # Without this, "(void) Strcpy(dst, src)" fails the helper regex and falls through
    # to _lower_expr which has no assignment-form rewriting for string helpers.
    t_novoid = re.sub(r"^\(\s*void\s*\)\s*", "", t)
    helper_lowered, helper_req = _lower_known_helper_stmt(t_novoid, rewrite_rules)
    if helper_lowered is not None:
        lowered_stmt = helper_lowered.strip()
        if lowered_stmt.startswith("{") and lowered_stmt.endswith("}"):
            return lowered_stmt, helper_req
        return f"{lowered_stmt};", helper_req
    original_call = _extract_call_name(t)
    pm = PANIC_RE.match(t)
    if pm:
        return f"throw new Error('{pm.group(1)}');", set()
    lowered, req = _lower_expr(t, rewrite_rules)
    if lowered is None:
        return None, set()
    # Final syntax scrub for residual C pointer sugar in call arguments.
    lowered = re.sub(r",\s*&\s*([A-Za-z_]\w*)", r", \1", lowered)
    lowered = re.sub(r"\(\s*\*\s*([A-Za-z_]\w*)", r"(\1", lowered)
    lowered_call = _extract_call_name(lowered)
    if (original_call in awaitable_calls or lowered_call in awaitable_calls) and not lowered.startswith("await "):
        return f"await {lowered};", req
    return f"{lowered};", req


def _split_top_level_args(src):
    out = []
    cur = []
    depth = 0
    in_str = None
    i = 0
    n = len(src or "")
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if in_str:
            cur.append(c)
            if c == in_str and (i == 0 or src[i - 1] != "\\"):
                in_str = None
            i += 1
            continue
        if c in ("'", '"'):
            in_str = c
            cur.append(c)
            i += 1
            continue
        if c == "/" and nxt == "/":
            # Keep comments as part of current chunk; caller already normalizes space.
            cur.append(c)
            cur.append(nxt)
            i += 2
            continue
        if c in "([{":
            depth += 1
            cur.append(c)
            i += 1
            continue
        if c in ")]}":
            depth = max(0, depth - 1)
            cur.append(c)
            i += 1
            continue
        if c == "," and depth == 0:
            out.append("".join(cur).strip())
            cur = []
            i += 1
            continue
        cur.append(c)
        i += 1
    tail = "".join(cur).strip()
    if tail:
        out.append(tail)
    return out


def _extract_string_literal(expr):
    """Return the raw string content from a quoted expression, or None."""
    s = expr.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        return s[1:-1]
    if len(s) >= 2 and s[0] == "'" and s[-1] == "'":
        return s[1:-1]
    # Template literal
    if len(s) >= 2 and s[0] == '`' and s[-1] == '`':
        return s[1:-1]
    return None


def _try_static_format_expr(fmt_str, arg_exprs):
    """Parse C printf format string at Python time, return JS expression.

    Returns (js_expr, is_single_value) or (None, False) on failure.
    is_single_value is True when the format is just "%s" with one arg,
    so the caller can emit a plain assignment instead of a template literal.
    """
    # Regex for C printf format specifiers
    spec_re = re.compile(r'%(?:%|[-+ #0]*(?:\*|\d+)?(?:\.(?:\*|\d+))?(?:[hlLzjt]*)[cCdiouxXfFeEgGaAnps])')
    parts = []       # list of (literal_str | None, format_spec | None)
    arg_idx = 0
    pos = 0
    while pos < len(fmt_str):
        m = spec_re.search(fmt_str, pos)
        if m is None:
            # Rest is literal text
            parts.append(fmt_str[pos:])
            break
        # Literal text before this specifier
        if m.start() > pos:
            parts.append(fmt_str[pos:m.start()])
        spec = m.group(0)
        if spec == '%%':
            parts.append('%')
            pos = m.end()
            continue
        # Parse the specifier to produce a JS expression
        js_expr = _format_spec_to_js(spec, arg_exprs, arg_idx)
        if js_expr is None:
            return None, False
        # Count consumed args
        consumed = spec.count('*') + 1
        arg_idx += consumed
        parts.append(('EXPR', js_expr))
        pos = m.end()

    if arg_idx != len(arg_exprs):
        # Arg count mismatch — fall back
        return None, False

    # Optimize: single %s with one arg → plain value
    expr_parts = [p for p in parts if isinstance(p, tuple)]
    literal_parts = [p for p in parts if isinstance(p, str)]
    if (len(expr_parts) == 1 and len(arg_exprs) == 1
            and all(p == '' for p in literal_parts)):
        # Just "%s" or "%d" with no surrounding text
        return expr_parts[0][1], True

    # Optimize: no format specifiers → plain string literal
    if not expr_parts:
        combined = ''.join(literal_parts)
        escaped = combined.replace('\\', '\\\\').replace('"', '\\"')
        return f'"{escaped}"', False

    # Build template literal
    tl_parts = []
    for p in parts:
        if isinstance(p, str):
            # Escape backticks and ${} in literal text
            escaped = p.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
            tl_parts.append(escaped)
        else:
            tl_parts.append('${' + p[1] + '}')
    return '`' + ''.join(tl_parts) + '`', False


def _format_spec_to_js(spec, arg_exprs, arg_idx):
    """Convert a single C format specifier to a JS expression, or None."""
    # Parse: %[flags][width][.precision][length]type
    m = re.match(r'^%([-+ #0]*)([\d*]*)(?:\.([\d*]*))?([hlLzjt]*)([cCdiouxXfFeEgGaAnps])$', spec)
    if not m:
        return None
    flags, width, precision, _length, conv = m.groups()

    # Handle * width/precision — not supported for static emit
    if width == '*' or precision == '*':
        # Special case: %.*s (precision from arg)
        if precision == '*' and conv == 's' and width == '':
            if arg_idx + 1 >= len(arg_exprs):
                return None
            prec_arg = arg_exprs[arg_idx]
            str_arg = arg_exprs[arg_idx + 1]
            # We'll consume 2 args; caller handles via spec.count('*')
            # But we need to return expr for the string arg using both
            return f'String({str_arg}).slice(0, {prec_arg})'
        return None

    if arg_idx >= len(arg_exprs):
        return None
    arg = arg_exprs[arg_idx]

    w = int(width) if width else 0
    if w <= 1 and not ('0' in flags):
        w = 0  # padStart(1)/padEnd(1) are no-ops; skip unless zero-padding
    left_align = '-' in flags
    zero_pad = '0' in flags
    plus_sign = '+' in flags

    if conv in ('s',):
        if w and left_align:
            return f'String({arg}).padEnd({w})'
        elif w:
            return f'String({arg}).padStart({w})'
        return arg

    if conv in ('d', 'i'):
        base_expr = arg
        if plus_sign:
            base_expr = f'(({arg}) > 0 ? "+" : "") + String({arg})'
            if w:
                pad_char = "'0'" if zero_pad else None
                pad_args = f'{w}' if not pad_char else f'{w}, {pad_char}'
                if left_align:
                    return f'({base_expr}).padEnd({pad_args})'
                return f'({base_expr}).padStart({pad_args})'
            return base_expr
        if w and zero_pad:
            return f'String({arg}).padStart({w}, "0")'
        elif w and left_align:
            return f'String({arg}).padEnd({w})'
        elif w:
            return f'String({arg}).padStart({w})'
        return arg

    if conv in ('u',):
        if w and zero_pad:
            return f'String({arg}).padStart({w}, "0")'
        elif w and left_align:
            return f'String({arg}).padEnd({w})'
        elif w:
            return f'String({arg}).padStart({w})'
        return arg

    if conv in ('x', 'X'):
        to_str = f'({arg}).toString(16)'
        if conv == 'X':
            to_str += '.toUpperCase()'
        if w and zero_pad:
            return f'{to_str}.padStart({w}, "0")'
        elif w and left_align:
            return f'{to_str}.padEnd({w})'
        elif w:
            return f'{to_str}.padStart({w})'
        return to_str

    if conv == 'c':
        return arg

    if conv in ('o',):
        to_str = f'({arg}).toString(8)'
        if w and zero_pad:
            return f'{to_str}.padStart({w}, "0")'
        elif w:
            return f'{to_str}.padStart({w})'
        return to_str

    if conv in ('f', 'F', 'e', 'E', 'g', 'G'):
        if precision is not None:
            p = int(precision) if precision else 0
            if conv in ('f', 'F'):
                return f'({arg}).toFixed({p})'
            elif conv in ('e', 'E'):
                return f'({arg}).toExponential({p})'
        return arg

    # Unsupported specifier
    return None


def _emit_c_format_expr(fmt_expr, arg_exprs):
    args_src = ", ".join(arg_exprs) if arg_exprs else ""
    return (
        "(() => { "
        f"const __a = [{args_src}]; "
        f"const __f = String({fmt_expr}); "
        "return __f.replace(/%[-+ #0-9.*hlLzjt]*[cCdiouxXfFeEgGaAnps%]/g, (m) => { "
        "if (m === '%%') return '%'; "
        "const __stars = (m.match(/\\*/g) || []).length; "
        "for (let __k = 0; __k < __stars; __k++) { if (__a.length) __a.shift(); } "
        "const __v = __a.length ? __a.shift() : ''; "
        "return String(__v ?? ''); "
        "}); "
        "})()"
    )


def _lower_known_helper_stmt(stmt, rewrite_rules):
    m = re.match(r"^([A-Za-z_]\w*)\s*\((.*)\)$", stmt.strip())
    if not m:
        return None, set()
    name = m.group(1)
    raw_args = _split_top_level_args(m.group(2))
    lowered_args = []
    required = set()
    for a in raw_args:
        la, req = _lower_expr(a, rewrite_rules)
        if la is None:
            return None, set()
        lowered_args.append(la)
        required.update(req)

    if name in {"Sprintf", "sprintf"}:
        if len(lowered_args) < 2:
            return None, set()
        dst, fmt = lowered_args[0], lowered_args[1]
        fmt_args = lowered_args[2:]
        # Try static template literal first
        fmt_str = _extract_string_literal(fmt)
        static_expr, is_single = (None, False)
        if fmt_str is not None:
            static_expr, is_single = _try_static_format_expr(fmt_str, fmt_args)
        eos_m = re.match(r"^eos\s*\(\s*(.+)\s*\)$", raw_args[0].strip())
        if eos_m:
            target_raw = eos_m.group(1).strip()
            target, req2 = _lower_expr(target_raw, rewrite_rules)
            if target is None:
                return None, set()
            required.update(req2)
            if static_expr is not None:
                return f"{target} += {static_expr}", required
            formatted = _emit_c_format_expr(fmt, fmt_args)
            return f"{{ const __fmt = {formatted}; {target} = ({target} ?? '') + __fmt; }}", required
        if static_expr is not None:
            return f"{dst} = {static_expr}", required
        formatted = _emit_c_format_expr(fmt, fmt_args)
        return f"{{ const __fmt = {formatted}; {dst} = __fmt; }}", required

    if name in {"Snprintf", "snprintf"}:
        if len(lowered_args) < 3:
            return None, set()
        dst, _maxlen, fmt = lowered_args[0], lowered_args[1], lowered_args[2]
        fmt_args = lowered_args[3:]
        # Try static template literal first (ignore size arg)
        fmt_str = _extract_string_literal(fmt)
        static_expr, is_single = (None, False)
        if fmt_str is not None:
            static_expr, is_single = _try_static_format_expr(fmt_str, fmt_args)
        eos_m = re.match(r"^eos\s*\(\s*(.+)\s*\)$", raw_args[0].strip())
        if eos_m:
            target_raw = eos_m.group(1).strip()
            target, req2 = _lower_expr(target_raw, rewrite_rules)
            if target is None:
                return None, set()
            required.update(req2)
            if static_expr is not None:
                return f"{target} += {static_expr}", required
            formatted = _emit_c_format_expr(fmt, fmt_args)
            bounded = f"({formatted}).slice(0, Math.max(0, Number({_maxlen}) - 1))"
            return f"{{ const __fmt = {bounded}; {target} = ({target} ?? '') + __fmt; }}", required
        if static_expr is not None:
            return f"{dst} = {static_expr}", required
        formatted = _emit_c_format_expr(fmt, fmt_args)
        bounded = f"({formatted}).slice(0, Math.max(0, Number({_maxlen}) - 1))"
        return f"{{ const __fmt = {bounded}; {dst} = __fmt; }}", required

    if name in {"Strcpy", "strcpy"} and len(lowered_args) >= 2:
        return f"{lowered_args[0]} = {lowered_args[1]}", required
    if name in {"Strcat", "strcat"} and len(lowered_args) >= 2:
        dst = lowered_args[0]
        return f"{dst} = ({dst} ?? '') + ({lowered_args[1]} ?? '')", required
    if name in {"Strncpy", "strncpy"} and len(lowered_args) >= 3:
        return (
            f"{lowered_args[0]} = ({lowered_args[1]} ?? '').slice(0, Math.max(0, Number({lowered_args[2]})))"
        ), required
    return None, set()


def _lower_expr(expr, rewrite_rules):
    out = _normalize_space(expr)
    if not out:
        return None, set()
    out = C_BLOCK_COMMENT_RE.sub(" ", out)
    out = re.sub(r"#\s*ifn?def\b[^#]*", " ", out)
    out = re.sub(r"#\s*if\b[^#]*", " ", out)
    out = re.sub(r"#\s*endif\b", " ", out)
    out = re.sub(r"#\s*\w+\b", " ", out)
    out, required_params = _apply_rewrite_rules(out, rewrite_rules)
    out = re.sub(r"\(\s*\*\s*([A-Za-z_]\w*)\s*\)\s*\(", r"\1(", out)
    out = re.sub(r"\bTRUE\b", "true", out)
    out = re.sub(r"\bFALSE\b", "false", out)
    out = re.sub(r"\bNULL\b", "null", out)
    # Drop C address-of on unary contexts only (don't touch binary '&' or '&&').
    out = re.sub(
        r"(?:(?<=^)|(?<=[(,=?:!<>]))\s*&\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*|\[[^\]]+\])*)",
        r" \1",
        out,
    )
    out = re.sub(r",\s*&\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*|\[[^\]]+\])*)", r", \1", out)
    out = re.sub(r"\(\s*&\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*|\[[^\]]+\])*)", r"(\1", out)
    out = re.sub(
        r"(?:(?<=^)|(?<=[(,=?:!<>]))\s*&\s*\(([^)]+)\)",
        r" (\1)",
        out,
    )
    # Drop simple C pointer deref on lvalues.
    out = re.sub(r"(^|[(,=?:])\s*\*\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*|\[[^\]]+\])*)", r"\1 \2", out)
    out = re.sub(r"!\s*\*\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)", r"!\1", out)
    out = re.sub(r"\(\s*void\s*\)\s*", "", out)
    out = re.sub(r"\(\s*(?:const\s+)?(?:struct|enum|union)\s+[A-Za-z_]\w*\s*\**\s*\)", "", out)
    out = re.sub(r"\(\s*(?:const\s+)?char\s*\*\s*\)", "", out)
    out = re.sub(
        r"\(\s*(?:const\s+)?(?:unsigned\s+|signed\s+)?[A-Za-z_]\w*\s*\*+\s*\)",
        "",
        out,
    )
    out = re.sub(
        r"\(\s*(?:unsigned|signed)\s+(?:char|short|int|long)\s*\)",
        "",
        out,
    )
    out = re.sub(
        r"\(\s*(?:unsigned\s+)?(?:int|long|short|coordxy|schar|uchar)\s*\)\s*\(([^()]+)\)",
        r"Math.trunc(\1)",
        out,
    )
    out = re.sub(
        r"\(\s*(?:unsigned|signed|long|short|int|char|float|double|boolean|coordxy|coord|"
        r"schar|uchar|xint16|xint32|xint64|aligntyp|genericptr_t)\s*\)",
        "",
        out,
    )
    out = re.sub(
        r"(?<![A-Za-z0-9_)\]])\(\s*(?:const\s+)?[A-Za-z_][A-Za-z0-9_]*\s*\)"
        r"(?=\s*(?:[A-Za-z_(\"'0-9*+\-!~]))",
        "",
        out,
    )
    # Common typedef casts (time_t, anything_t, etc.) have no JS equivalent.
    out = re.sub(r"\(\s*(?:const\s+)?[A-Za-z_]\w*_t\s*\)", "", out)
    # Deref casted pointers like *(int *)vptr -> vptr.
    out = re.sub(
        r"\*\s*\(\s*(?:const\s+)?(?:unsigned\s+|signed\s+|long\s+|short\s+)?"
        r"(?:int|char|float|double|boolean|coordxy|coord|schar|uchar|xint16|xint32|xint64)"
        r"\s*\*\s*\)\s*([A-Za-z_]\w*(?:\[[^\]]+\])?)",
        r"\1",
        out,
    )
    out = re.sub(r"\*\s*\(\s*([^)]+)\s*\)", r"(\1)", out)
    # Function-pointer null-casts like ((int (*)(...)) 0) -> null.
    out = re.sub(r"\(\s*[A-Za-z_]\w*\s*\(\s*\*\s*\)\s*\([^)]*\)\s*\)\s*0\b", "null", out)
    out = re.sub(r"\(\s*[A-Za-z_]\w*\s*\(\s*\)\s*\([^)]*\)\s*\)\s*0\b", "null", out)
    out = re.sub(r"\(\s*[A-Za-z_]\w*\s*\*\s*\)\s*0\b", "null", out)
    # Run pointer-deref scalar cleanup again after cast stripping, so patterns
    # like *(int *)vptr normalize to vptr.
    out = re.sub(r"(^|[(,=?:])\s*\*\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*|\[[^\]]+\])*)", r"\1 \2", out)
    out = re.sub(r"!\s*\*\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)", r"!\1", out)
    # C pointer member access lowers to JS property access.
    out = out.replace("->", ".")
    # Canonicalize common C helper calls to JS equivalents.
    out = re.sub(r"\bmax\s*\(", "Math.max(", out)
    out = re.sub(r"\bmin\s*\(", "Math.min(", out)
    out = re.sub(r"\babs\s*\(", "Math.abs(", out)
    out = re.sub(r"\bstrlen\s*\(\s*([^()]+?)\s*\)", r"(\1 ?? '').length", out)
    out = re.sub(r"\batoi\s*\(\s*([^()]+?)\s*\)", r"Number.parseInt(\1, 10)", out)
    out = re.sub(
        r"\bstrcmpi\s*\(\s*([^(),]+?)\s*,\s*([^()]+?)\s*\)",
        r"(String(\1).toLowerCase().localeCompare(String(\2).toLowerCase()))",
        out,
    )
    out = re.sub(
        r"\bstrncmpi\s*\(\s*([^(),]+?)\s*,\s*([^(),]+?)\s*,\s*([^()]+?)\s*\)",
        (
            r"(String(\1).slice(0, Number(\3)).toLowerCase()"
            r".localeCompare(String(\2).slice(0, Number(\3)).toLowerCase()))"
        ),
        out,
    )
    out = re.sub(r"\beos\s*\(\s*([^()]+?)\s*\)", r"(String(\1).length)", out)
    # free() is a no-op in JS runtime; preserve operand side-effects only.
    out = re.sub(r"\bfree\s*\(\s*([^()]+?)\s*\)", r"(\1, 0)", out)
    # C integer long suffix (e.g., 7L) has no JS runtime equivalent.
    out = re.sub(r"\b(0x[0-9A-Fa-f]+|\d+)(?:ULL|LLU|UL|LU|LL|L|U)\b", r"\1", out)
    # C octal integer literals (e.g., 040) -> JS octal (0o40).
    out = re.sub(r"(?<![A-Za-z0-9_.])0([0-7]{1,})\b", lambda m: "0" if m.group(1) == "0" else f"0o{m.group(1)}", out)
    out = re.sub(r"\bsizeof\s+([A-Za-z_]\w*)\b", r"\1.length", out)
    out = re.sub(
        r'\bsizeof\s+("(?:(?:\\.)|[^"\\])*")',
        r"(\1).length",
        out,
    )
    out = re.sub(r"\(\s*boolean\s*\)\s*", "", out)
    out = _rewrite_c_char_literals(out)
    out = _rewrite_octal_escapes(out)
    out = _rewrite_adjacent_string_literals(out)
    out = _rewrite_printf_int_macros(out)
    # Address-of in return position is pointer semantics in C; drop for JS refs.
    out = re.sub(r"\breturn\s*&\s*([A-Za-z_]\w*(?:\[[^\]]+\])?)", r"return \1", out)
    out = re.sub(
        r"\(\s*game\?\.svc\?\.context\?\.run\s*\|\|\s*0\s*\)\s*=(?!=)",
        "game.svc.context.run =",
        out,
    )
    out = re.sub(
        r"\(\s*game\?\.flags\?\.runmode\s*\|\|\s*'leap'\s*\)\s*=(?!=)",
        "game.flags.runmode =",
        out,
    )
    out = re.sub(r"([A-Za-z_]\w*)\+\+\s*=", r"\1 =", out)
    out = re.sub(r"\bclass\b", "class_", out)
    out = re.sub(r"\blet\b", "let_", out)
    out = re.sub(r"\bin\b", "in_", out)
    # Remove unary pointer-deref in boolean/comparison contexts: *p -> p.
    out = re.sub(r"([(&|!=?:,]\s*)\*\s*([A-Za-z_]\w*)", r"\1\2", out)
    out = re.sub(r"(?<![=!<>])==(?![=])", "===", out)
    out = re.sub(r"(?<![=!<>])!=(?![=])", "!==", out)
    # C buffer-clear idiom: buf[0] = '\0' (or chained a[0] = b[0] = '\0')
    # means "set to empty string" in JS. '\0' is already rewritten to '\x00'
    # by _rewrite_c_char_literals at this point, so match that form.
    out = re.sub(
        r"([A-Za-z_]\w*(?:\s*\[\s*0\s*\]\s*=\s*)*[A-Za-z_]\w*)\s*\[\s*0\s*\]\s*=\s*'\\x00'",
        lambda m: m.group(0).replace("[0]", "").replace("'\\x00'", "''"),
        out,
    )
    # Guard against AST text-extraction bug that corrupts '&&' to '&': a lone '&'
    # between relational sub-expressions (where the left side ends with a comparison
    # result) must be '&&'. Handles both spaced and unspaced forms.
    out = re.sub(
        r"([><=!]=?\s+\S+)\s*&\s*([A-Za-z_(])",
        r"\1 && \2",
        out,
    )
    return out, required_params


def _rewrite_c_char_literals(text):
    def repl(match):
        digits = match.group(1)
        value = int(digits, 8) & 0xFF
        return f"'\\x{value:02x}'"

    return re.sub(r"'\\([0-7]{1,3})'", repl, text)


def _rewrite_octal_escapes(text):
    def repl(match):
        digits = match.group(1)
        value = int(digits, 8) & 0xFF
        return f"\\x{value:02x}"

    return re.sub(r"\\([0-7]{1,3})", repl, text)


def _rewrite_adjacent_string_literals(text):
    patt = re.compile(r'("(?:(?:\\.)|[^"\\])*")\s+("(?:(?:\\.)|[^"\\])*")')
    prev = None
    out = text
    while prev != out:
        prev = out
        out = patt.sub(r"\1 + \2", out)
    return out


def _rewrite_printf_int_macros(text):
    out = text
    out = re.sub(r'"%"\s*PRId(?:32|64)', '"%d"', out)
    out = re.sub(r'"%"\s*PRIu(?:32|64)', '"%u"', out)
    out = re.sub(r'"%"\s*PRIx(?:32|64)', '"%x"', out)
    out = re.sub(r'"%"\s*PRIo(?:32|64)', '"%o"', out)
    return out


def _normalize_space(text):
    return " ".join((text or "").replace("\n", " ").split())


def _diag(code, message):
    return {"severity": "warning", "code": code, "message": message}


def _extract_decl_name(lhs):
    raw = C_BLOCK_COMMENT_RE.sub(" ", lhs or "")
    raw = raw.strip()
    if not raw:
        return None
    # Strip array suffixes from declarators: foo[39] -> foo
    raw = re.sub(r"\[[^\]]*\]", " ", raw)
    # Remove pointer stars in declarations: *foo -> foo
    raw = raw.replace("*", " ")
    # Take the last identifier as declarator name.
    names = re.findall(r"[A-Za-z_]\w*", raw)
    if not names:
        return None
    return _sanitize_ident(names[-1])


def _load_async_info(src_path, func_name):
    try:
        summary = build_async_summary(src_path)
    except Exception:
        return {"requires_async": False, "awaitable_calls": set()}

    fn = None
    for candidate in summary.get("functions", []):
        if candidate.get("name") == func_name:
            fn = candidate
            break
    if fn is None:
        return {"requires_async": False, "awaitable_calls": set()}
    direct = set(fn.get("direct_awaited_boundaries", []))
    async_callees = set(fn.get("awaited_boundary_callsites", []))
    awaitable = direct | async_callees
    return {
        "requires_async": bool(fn.get("requires_async")),
        "awaitable_calls": awaitable,
    }


def _extract_call_name(expr):
    m = re.match(r"^\s*([A-Za-z_]\w*)\s*\(", expr or "")
    if not m:
        return None
    return m.group(1)


def _load_rewrite_rules():
    rules = []
    base = Path("tools/c_translator/rulesets")
    for fname in ("function_map.json", "state_paths.json"):
        p = base / fname
        if not p.exists():
            continue
        data = json.loads(p.read_text(encoding="utf-8"))
        for rule in data.get("rewrites", []):
            cexpr = rule.get("c")
            jexpr = rule.get("js")
            if isinstance(cexpr, str) and isinstance(jexpr, str):
                rules.append(
                    {
                        "c": cexpr,
                        "js": jexpr,
                        "requires_params": set(rule.get("requires_params", [])),
                    }
                )
    rules.sort(key=lambda r: len(r["c"]), reverse=True)
    return rules


def _apply_rewrite_rules(expr, rules):
    out = expr
    required = set()
    for rule in rules:
        if rule["c"] in out:
            out = out.replace(rule["c"], rule["js"])
            required.update(rule["requires_params"])
    # Remove any cascaded game.game. artifacts that arise when one rewrite
    # (e.g. "svc.context." -> "game.svc.context.") produces output that
    # contains the search string of a later rule (e.g. "svc." -> "game.svc.").
    prev = None
    while prev != out:
        prev = out
        out = out.replace("game.game.", "game.")
    return out, required


def _find_unresolved_tokens(lines):
    bad = set()
    joined = "\n".join(lines)
    if re.search(r"\bsvi\.", joined):
        bad.add("svi.")
    if re.search(r"&\s*u\.", joined):
        bad.add("&u.")
    if re.search(r"\bu\.[A-Za-z_]\w*", joined):
        bad.add("u.")
    if re.search(r"\blevl\s*\[", joined):
        bad.add("levl[]")
    if re.search(r"\bSokoban\b", joined):
        bad.add("Sokoban")
    if re.search(r"\bigame\.", joined):
        bad.add("igame.")
    if re.search(r"\bgo\.", joined):
        bad.add("go.")
    if re.search(r"\bgy\.", joined):
        bad.add("gy.")
    if re.search(r"\bgc\.", joined):
        bad.add("gc.")
    if re.search(r"\bgt\.", joined):
        bad.add("gt.")
    if re.search(r"\bgv\.", joined):
        bad.add("gv.")
    if re.search(r"\bgi\.", joined):
        bad.add("gi.")
    if re.search(r"\bgw\.", joined):
        bad.add("gw.")
    if re.search(r"\bga\.", joined):
        bad.add("ga.")
    if re.search(r"\bgl\.", joined):
        bad.add("gl.")
    if re.search(r"\bsvl\.", joined):
        bad.add("svl.")
    if re.search(r"\bsvd\.", joined):
        bad.add("svd.")
    if re.search(r"\bsvn\.", joined):
        bad.add("svn.")
    if re.search(r"\bsvr\.", joined):
        bad.add("svr.")
    if re.search(r"\bsvb\.", joined):
        bad.add("svb.")
    if re.search(r"\bsvx\.", joined):
        bad.add("svx.")
    if re.search(r"\bsvy\.", joined):
        bad.add("svy.")
    if re.search(r"\bsvplayer\.", joined):
        bad.add("svplayer.")
    if re.search(r"\bgplayer\.", joined):
        bad.add("gplayer.")
    if re.search(r"\bprogram_state\.", joined):
        bad.add("program_state.")
    # W_* constants are valid symbols in translated C and handled by imports/rules.
    if re.search(r"(?<!game\.)\bsvc\.", joined):
        bad.add("svc.")
    if re.search(r"(?<!game\.)\bgm\.", joined):
        bad.add("gm.")
    if re.search(r"(?<!game\.)\bflags\.", joined):
        bad.add("flags.")
    if re.search(r"\bsvm\.", joined):
        bad.add("svm.")
    if re.search(r"(?<!game\.)\bdisp\.", joined):
        bad.add("disp.")
    if re.search(r"\b\d+L\b", joined):
        bad.add("*L")
    if "->" in joined:
        bad.add("->")
    if re.search(r"\(\s*(?:const\s+)?(?:struct|enum|union)\s+[A-Za-z_]\w*\s*\)", joined):
        bad.add("C-cast")
    # Common C libc/string helpers should be rewritten before JS stitching.
    if re.search(r"\b(strcmp|strncmp|strcpy|strcat|sprintf|snprintf|memcpy|memset|memcmp)\s*\(", joined):
        bad.add("C-libcall")
    return bad


def _find_legacy_js_tokens(lines):
    bad = set()
    joined = "\n".join(lines)
    if re.search(r"\bmap\._[A-Za-z_]\w*", joined):
        bad.add("map._*")
    if re.search(r"\bgame\._[A-Za-z_]\w*", joined):
        bad.add("game._*")
    if re.search(r"\bglobals\.", joined):
        bad.add("globals.*")
    if re.search(r"\bstate\.", joined):
        bad.add("state.*")
    return bad
