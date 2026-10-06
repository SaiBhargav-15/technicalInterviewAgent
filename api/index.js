// Vercel function entry: re-exports the esbuild bundle produced by `npm run build`.
// Avoids Vercel compiling server.ts as raw ESM with extensionless imports.
import server from "../dist/server.cjs";

export default server.default ?? server.app ?? server;
