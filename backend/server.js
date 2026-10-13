import { createServer } from 'node:http';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(rootDir, '..');
const seedPath = path.join(projectDir, 'db.json');
const databasePath = path.resolve(process.env.DATA_FILE || seedPath);
const frontendDir = path.join(projectDir, 'dist');
const port = Number(process.env.PORT) || 3001;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

const sendJson = (response, statusCode, data) => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
};

const readDatabase = async () => JSON.parse(await readFile(databasePath, 'utf8'));

const saveDatabase = async (database) => {
  await writeFile(databasePath, `${JSON.stringify(database, null, 2)}\n`);
};

const initializeDatabase = async () => {
  await mkdir(path.dirname(databasePath), { recursive: true });
  try {
    await readFile(databasePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (databasePath !== seedPath) {
      await copyFile(seedPath, databasePath);
    } else {
      await saveDatabase({ persons: [] });
    }
  }
};

const readBody = (request) => new Promise((resolve, reject) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) {
      reject(new Error('Request body is too large'));
      request.destroy();
    }
  });
  request.on('end', () => {
    try {
      resolve(JSON.parse(body));
    } catch {
      reject(new Error('Request body must be valid JSON'));
    }
  });
  request.on('error', reject);
});

const serveFrontend = async (pathname, response) => {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const candidatePath = path.resolve(frontendDir, `.${requestedPath}`);
  if (!candidatePath.startsWith(`${frontendDir}${path.sep}`)) return false;

  try {
    const file = await readFile(candidatePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(candidatePath)] || 'application/octet-stream'
    });
    response.end(file);
    return true;
  } catch {
    return false;
  }
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname === '/api/persons' && request.method === 'GET') {
      const database = await readDatabase();
      return sendJson(response, 200, database.persons);
    }

    const personRoute = pathname.match(/^\/api\/persons\/([^/]+)$/);
    if (personRoute) {
      const id = personRoute[1];
      const database = await readDatabase();
      const person = database.persons.find((entry) => String(entry.id) === id);

      if (request.method === 'GET') {
        return person
          ? sendJson(response, 200, person)
          : sendJson(response, 404, { error: 'Person not found' });
      }

      if (request.method === 'DELETE') {
        if (!person) return sendJson(response, 404, { error: 'Person not found' });
        database.persons = database.persons.filter((entry) => String(entry.id) !== id);
        await saveDatabase(database);
        response.writeHead(204);
        return response.end();
      }

      if (request.method === 'PUT') {
        if (!person) return sendJson(response, 404, { error: 'Person not found' });
        const body = await readBody(request);
        if (!body.name?.trim() || !body.number?.trim()) {
          return sendJson(response, 400, { error: 'Name and number are required' });
        }
        const updatedPerson = { ...person, name: body.name.trim(), number: body.number.trim() };
        database.persons = database.persons.map((entry) =>
          String(entry.id) === id ? updatedPerson : entry
        );
        await saveDatabase(database);
        return sendJson(response, 200, updatedPerson);
      }
    }

    if (pathname === '/api/persons' && request.method === 'POST') {
      const body = await readBody(request);
      if (!body.name?.trim() || !body.number?.trim()) {
        return sendJson(response, 400, { error: 'Name and number are required' });
      }
      const database = await readDatabase();
      const newPerson = {
        id: String(Math.max(0, ...database.persons.map((person) => Number(person.id) || 0)) + 1),
        name: body.name.trim(),
        number: body.number.trim()
      };
      database.persons.push(newPerson);
      await saveDatabase(database);
      return sendJson(response, 201, newPerson);
    }

    if (pathname.startsWith('/api/')) {
      return sendJson(response, 404, { error: 'Unknown API endpoint' });
    }

    if (request.method === 'GET' && await serveFrontend(pathname, response)) return;
    if (request.method === 'GET' && await serveFrontend('/index.html', response)) return;
    return sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    const statusCode = error.message === 'Request body is too large' ? 413 : 400;
    return sendJson(response, statusCode, { error: error.message });
  }
});

await initializeDatabase();
server.listen(port, '0.0.0.0', () => {
  console.log(`Phonebook server listening on port ${port}`);
});
