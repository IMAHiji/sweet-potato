# Sweet Potato — Claude Notes

## Codebase navigation

Before grepping or reading files to answer structural questions (which route is in which file, what a module imports, how the client and server layers connect), check **`CODEGRAPH.json`** first — it contains a pre-built route index and module dependency map. Use `pnpm codegraph` to regenerate it after structural changes.

`CODEGRAPH.md` has the same data as a Mermaid diagram if a visual overview is more useful.
