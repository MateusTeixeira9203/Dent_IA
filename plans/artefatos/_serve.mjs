import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('.');
const contentType = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(request.url?.split('?')[0] ?? '/');
  const target = resolve(root, `.${pathname === '/' ? '/R-139d-visualizador-clinico-arquivos.html' : pathname}`);
  if (!target.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end();
    return;
  }

  try {
    const file = await readFile(target);
    response.writeHead(200, { 'Content-Type': contentType[extname(target)] ?? 'application/octet-stream' });
    response.end(file);
  } catch {
    response.writeHead(404).end('nao encontrado');
  }
}).listen(8899);
