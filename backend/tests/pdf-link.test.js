const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// On simule MariaDB, MongoDB (journal et messagerie), le PDF et l'e-mail.
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn()
}));

jest.mock('../src/services/mailService', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/services/logService', () => ({
  addLog: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/services/notificationService', () => ({
  notifyEmail: jest.fn(),
  notifyAdmins: jest.fn(),
  listFor: jest.fn(),
  markAllRead: jest.fn()
}));

jest.mock('../src/services/pdfService', () => ({
  generateQuotePdf: jest.fn().mockResolvedValue('/tmp/devis.pdf'),
  pdfPath: jest.fn()
}));

const pool = require('../src/config/db');
const { pdfPath } = require('../src/services/pdfService');
const app = require('../src/server');

const SECRET = process.env.JWT_SECRET || 'change-me';
const PDF_KEY = `${SECRET}|pdf-link`;

const session = (role, id) =>
  jwt.sign({ id, email: 'jules@example.com', role }, SECRET);

const client = () => `Bearer ${session('CLIENT', 4)}`;
const admin = () => `Bearer ${session('ADMIN', 1)}`;

const quoteRow = (overrides = {}) => ({
  id: 5,
  event_id: 2,
  client_id: 2,
  status: 'ETUDE_CLIENT',
  total_ht: 4800,
  tva: 960,
  total_ttc: 5760,
  has_pdf: 1,
  company_name: 'Credit Agricole',
  firstname: 'Jules',
  lastname: 'Vernes',
  client_email: 'jules@example.com',
  event_name: 'Conference',
  ...overrides
});

const LOAD_QUOTE = /JOIN events e ON e\.id = q\.event_id WHERE q\.id = \?/;
const OWN_CLIENTS = /FROM clients WHERE user_id = \?/;

function sql(rules) {
  pool.query.mockImplementation((text) => {
    const query = String(text).replace(/\s+/g, ' ');
    const rule = rules.find(([pattern]) => pattern.test(query));

    return rule
      ? Promise.resolve(rule[1])
      : Promise.reject(new Error(`Requete SQL inattendue : ${query.slice(0, 90)}`));
  });
}

const OWNER = [
  [LOAD_QUOTE, [[quoteRow()], []]],
  [OWN_CLIENTS, [[{ id: 2 }], []]]
];

let pdfFile;

beforeAll(() => {
  pdfFile = path.join(os.tmpdir(), `innovevents-test-devis-${process.pid}.pdf`);
  fs.writeFileSync(pdfFile, '%PDF-1.4\n% devis de test\n');
});

afterAll(() => {
  fs.rmSync(pdfFile, { force: true });
});

beforeEach(() => {
  jest.clearAllMocks();
  pdfPath.mockReturnValue(pdfFile);
});

describe('Devis - lien PDF temporaire (application mobile)', () => {
  test('Le propriétaire obtient un lien, qui ouvre le PDF sans en-tête Authorization', async () => {
    sql(OWNER);

    const link = await request(app)
      .post('/api/quotes/5/pdf-link')
      .set('Authorization', client());

    expect(link.status).toBe(200);
    expect(link.body.path).toMatch(/^\/api\/quotes\/5\/pdf\?token=/);

    const pdf = await request(app).get(link.body.path);

    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
  });

  test("Un client n'obtient pas de lien pour le devis d'un autre client", async () => {
    sql([
      [LOAD_QUOTE, [[quoteRow({ client_id: 9 })], []]],
      [OWN_CLIENTS, [[{ id: 2 }], []]]
    ]);

    const link = await request(app)
      .post('/api/quotes/5/pdf-link')
      .set('Authorization', client());

    expect(link.status).toBe(404);
  });

  test("Un client n'obtient pas de lien pour un brouillon", async () => {
    sql([
      [LOAD_QUOTE, [[quoteRow({ status: 'BROUILLON' })], []]],
      [OWN_CLIENTS, [[{ id: 2 }], []]]
    ]);

    const link = await request(app)
      .post('/api/quotes/5/pdf-link')
      .set('Authorization', client());

    expect(link.status).toBe(404);
  });

  test("L'administrateur obtient un lien, même pour un brouillon", async () => {
    sql([[LOAD_QUOTE, [[quoteRow({ status: 'BROUILLON' })], []]]]);

    const link = await request(app)
      .post('/api/quotes/5/pdf-link')
      .set('Authorization', admin());

    expect(link.status).toBe(200);
  });

  test('Sans connexion, aucun lien ne peut être demandé', async () => {
    const link = await request(app).post('/api/quotes/5/pdf-link');

    expect(link.status).toBe(401);
  });

  test("Un lien ne vaut que pour son devis", async () => {
    sql(OWNER);

    const link = await request(app)
      .post('/api/quotes/5/pdf-link')
      .set('Authorization', client());

    const token = new URL(link.body.path, 'http://localhost').searchParams.get('token');
    const other = await request(app).get(`/api/quotes/6/pdf?token=${token}`);

    expect(other.status).toBe(401);
  });

  test('Un lien expiré est refusé', async () => {
    sql(OWNER);

    const token = jwt.sign(
      { typ: 'quote-pdf', quote: 5, id: 4, email: 'jules@example.com', role: 'CLIENT' },
      PDF_KEY,
      { expiresIn: -10 }
    );

    const response = await request(app).get(`/api/quotes/5/pdf?token=${token}`);

    expect(response.status).toBe(401);
  });

  test('Un lien falsifié (mauvaise clé) est refusé', async () => {
    sql(OWNER);

    const token = jwt.sign(
      { typ: 'quote-pdf', quote: 5, id: 1, email: 'x@example.com', role: 'ADMIN' },
      'une-autre-cle',
      { expiresIn: '2m' }
    );

    const response = await request(app).get(`/api/quotes/5/pdf?token=${token}`);

    expect(response.status).toBe(401);
  });

  test('Un jeton de session ne se glisse pas dans le paramètre token', async () => {
    sql(OWNER);

    const response = await request(app).get(`/api/quotes/5/pdf?token=${session('ADMIN', 1)}`);

    expect(response.status).toBe(401);
  });

  test("Un lien PDF ne peut pas servir de jeton de session sur les autres routes", async () => {
    sql(OWNER);

    const link = await request(app)
      .post('/api/quotes/5/pdf-link')
      .set('Authorization', client());

    const token = new URL(link.body.path, 'http://localhost').searchParams.get('token');

    const other = await request(app)
      .get('/api/quotes/mine')
      .set('Authorization', `Bearer ${token}`);

    expect(other.status).toBe(401);
  });

  test("Le lien respecte toujours les droits : le devis d'un autre client reste introuvable", async () => {
    sql([
      [LOAD_QUOTE, [[quoteRow({ client_id: 9 })], []]],
      [OWN_CLIENTS, [[{ id: 2 }], []]]
    ]);

    const token = jwt.sign(
      { typ: 'quote-pdf', quote: 5, id: 4, email: 'jules@example.com', role: 'CLIENT' },
      PDF_KEY,
      { expiresIn: '2m' }
    );

    const response = await request(app).get(`/api/quotes/5/pdf?token=${token}`);

    expect(response.status).toBe(404);
  });

  test("L'accès classique par en-tête Authorization fonctionne toujours", async () => {
    sql(OWNER);

    const response = await request(app)
      .get('/api/quotes/5/pdf')
      .set('Authorization', client());

    expect(response.status).toBe(200);
  });
});
