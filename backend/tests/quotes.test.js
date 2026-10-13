
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
  pdfPath: jest.fn(() => '/tmp/devis-inexistant.pdf')
}));

const pool = require('../src/config/db');
const { sendMail } = require('../src/services/mailService');
const {
  notifyEmail,
  notifyAdmins,
  listFor
} = require('../src/services/notificationService');
const app = require('../src/server');

const tokenFor = (role, id = 4) =>
  jwt.sign(
    { id, email: 'jules@example.com', role },
    process.env.JWT_SECRET || 'change-me'
  );

const admin = () => `Bearer ${tokenFor('ADMIN', 1)}`;
const employee = () => `Bearer ${tokenFor('EMPLOYEE', 2)}`;
const client = () => `Bearer ${tokenFor('CLIENT', 4)}`;

const quoteRow = (overrides = {}) => ({
  id: 5,
  event_id: 2,
  client_id: 2,
  status: 'ETUDE_CLIENT',
  total_ht: 4800,
  tva: 960,
  total_ttc: 5760,
  has_pdf: 1,
  created_at: '2026-10-13T10:00:00.000Z',
  company_name: 'Crédit Agricole',
  firstname: 'Jules',
  lastname: 'Vernes',
  client_email: 'jules@example.com',
  client_address: 'Lyon',
  event_name: 'Conférence',
  event_start: '2026-12-10T09:00:00.000Z',
  event_end: '2026-12-10T18:00:00.000Z',
  event_location: 'Lyon',
  ...overrides
});

// Chaque règle associe un motif SQL à son résultat ; toute autre requête fait échouer le test.
function sql(rules) {
  pool.query.mockImplementation((text) => {
    const query = String(text).replace(/\s+/g, ' ');
    const rule = rules.find(([pattern]) => pattern.test(query));

    if (!rule) {
      return Promise.reject(
        new Error(`Requête SQL inattendue : ${query.slice(0, 90)}`)
      );
    }

    return Promise.resolve(rule[1]);
  });
}

const LOAD_QUOTE = /JOIN events e ON e\.id = q\.event_id WHERE q\.id = \?/;
const OWN_CLIENTS = /FROM clients WHERE user_id = \?/;
const UPDATE_RESPONSE = /UPDATE quotes SET status = \? WHERE id = \?/;
const UPDATE_SEND = /UPDATE quotes SET status = "ETUDE_CLIENT" WHERE id = \?/;

const updates = () =>
  pool.query.mock.calls.filter(([text]) => /UPDATE quotes/.test(text));

function mockConnection({ failOnItem = false } = {}) {
  const connection = {
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
    query: jest.fn((text) => {
      if (/INSERT INTO quotes/.test(text)) {
        return Promise.resolve([{ insertId: 7 }]);
      }

      return failOnItem
        ? Promise.reject(new Error('Erreur SQL simulée'))
        : Promise.resolve([{ insertId: 1 }]);
    })
  };

  pool.getConnection.mockResolvedValue(connection);

  return connection;
}

describe('Devis - droits d’accès', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Refuse la liste des devis sans JWT', async () => {
    const response = await request(app).get('/api/quotes');

    expect(response.status).toBe(401);
  });

  test('Refuse la liste de tous les devis à un client', async () => {
    const response = await request(app)
      .get('/api/quotes')
      .set('Authorization', client());

    expect(response.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('Refuse la création d’un devis à un employé', async () => {
    const response = await request(app)
      .post('/api/quotes')
      .set('Authorization', employee())
      .send({
        event_id: 2,
        client_id: 2,
        items: [{ label: 'Salle', amount_ht: 100 }]
      });

    expect(response.status).toBe(403);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  test('Refuse « mes devis » à un administrateur', async () => {
    const response = await request(app)
      .get('/api/quotes/mine')
      .set('Authorization', admin());

    expect(response.status).toBe(403);
  });

  test('Un administrateur liste les devis avec leurs lignes', async () => {
    sql([
      [/ORDER BY q\.created_at DESC/, [[quoteRow()], []]],
      [
        /FROM quote_items WHERE quote_id IN/,
        [[{ quote_id: 5, label: 'Salle', amount_ht: 4800 }], []]
      ]
    ]);

    const response = await request(app)
      .get('/api/quotes')
      .set('Authorization', admin());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].has_pdf).toBe(true);
    expect(response.body[0].items).toEqual([
      { label: 'Salle', amount_ht: 4800 }
    ]);
  });
});

describe('Devis - création', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Refuse un devis sans aucune ligne', async () => {
    const response = await request(app)
      .post('/api/quotes')
      .set('Authorization', admin())
      .send({ event_id: 2, client_id: 2, items: [] });

    expect(response.status).toBe(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  test('Refuse une ligne avec un montant négatif', async () => {
    const response = await request(app)
      .post('/api/quotes')
      .set('Authorization', admin())
      .send({
        event_id: 2,
        client_id: 2,
        items: [{ label: 'Remise', amount_ht: -50 }]
      });

    expect(response.status).toBe(400);
  });

  test('Refuse un événement qui appartient à un autre client', async () => {
    sql([[/SELECT id, client_id FROM events/, [[{ id: 2, client_id: 9 }], []]]]);

    const response = await request(app)
      .post('/api/quotes')
      .set('Authorization', admin())
      .send({
        event_id: 2,
        client_id: 2,
        items: [{ label: 'Salle', amount_ht: 100 }]
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/n’appartient pas/);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  test('Calcule les totaux en centimes et enregistre dans une transaction', async () => {
    sql([[/SELECT id, client_id FROM events/, [[{ id: 2, client_id: 2 }], []]]]);
    const connection = mockConnection();

    const response = await request(app)
      .post('/api/quotes')
      .set('Authorization', admin())
      .send({
        event_id: 2,
        client_id: 2,
        items: [
          { label: 'Location', amount_ht: 0.1 },
          { label: 'Traiteur', amount_ht: 0.2 }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 7,
      status: 'BROUILLON',
      total_ht: 0.3,
      tva: 0.06,
      total_ttc: 0.36
    });

    const quoteInsert = connection.query.mock.calls[0];
    expect(quoteInsert[1]).toEqual([2, 2, 0.3, 0.06, 0.36]);
    expect(connection.query).toHaveBeenCalledTimes(3);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test('Annule toute la transaction si une ligne ne peut pas être enregistrée', async () => {
    sql([[/SELECT id, client_id FROM events/, [[{ id: 2, client_id: 2 }], []]]]);
    const connection = mockConnection({ failOnItem: true });
    const silence = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(app)
      .post('/api/quotes')
      .set('Authorization', admin())
      .send({
        event_id: 2,
        client_id: 2,
        items: [{ label: 'Salle', amount_ht: 100 }]
      });

    silence.mockRestore();

    expect(response.status).toBe(500);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});

describe('Devis - espace client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Un client sans fiche n’a aucun devis', async () => {
    sql([[OWN_CLIENTS, [[], []]]]);

    const response = await request(app)
      .get('/api/quotes/mine')
      .set('Authorization', client());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('Un client ne voit jamais les brouillons', async () => {
    sql([
      [OWN_CLIENTS, [[{ id: 2 }], []]],
      [/WHERE q\.client_id IN \(\?\)/, [[], []]]
    ]);

    const response = await request(app)
      .get('/api/quotes/mine')
      .set('Authorization', client());

    const listing = pool.query.mock.calls
      .map(([text]) => String(text).replace(/\s+/g, ' '))
      .find((text) => /q\.client_id IN/.test(text));

    expect(response.status).toBe(200);
    expect(listing).toMatch(/q\.status <> 'BROUILLON'/);
  });

  test('Un client ne télécharge pas le PDF du devis d’un autre client', async () => {
    sql([
      [LOAD_QUOTE, [[quoteRow({ client_id: 9 })], []]],
      [OWN_CLIENTS, [[{ id: 2 }], []]]
    ]);

    const response = await request(app)
      .get('/api/quotes/5/pdf')
      .set('Authorization', client());

    expect(response.status).toBe(404);
  });

  test('Un client ne télécharge pas le PDF d’un brouillon', async () => {
    sql([
      [LOAD_QUOTE, [[quoteRow({ status: 'BROUILLON' })], []]],
      [OWN_CLIENTS, [[{ id: 2 }], []]]
    ]);

    const response = await request(app)
      .get('/api/quotes/5/pdf')
      .set('Authorization', client());

    expect(response.status).toBe(404);
  });

  test('Refuse le téléchargement d’un PDF sans JWT', async () => {
    const response = await request(app).get('/api/quotes/5/pdf');

    expect(response.status).toBe(401);
  });
});

describe('Devis - réponse du client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Refuse une action inconnue au lieu de refuser le devis par défaut', async () => {
    const response = await request(app)
      .post('/api/quotes/5/respond')
      .set('Authorization', client())
      .send({ action: 'peut-etre' });

    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('Exige un commentaire pour une demande de modification', async () => {
    const response = await request(app)
      .post('/api/quotes/5/respond')
      .set('Authorization', client())
      .send({ action: 'modify', comment: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/modification/);
  });

  test('Refuse la réponse d’un client à un devis qui n’est pas le sien', async () => {
    sql([
      [LOAD_QUOTE, [[quoteRow({ client_id: 9 })], []]],
      [OWN_CLIENTS, [[{ id: 2 }], []]]
    ]);

    const response = await request(app)
      .post('/api/quotes/5/respond')
      .set('Authorization', client())
      .send({ action: 'accept' });

    expect(response.status).toBe(404);
    expect(updates()).toHaveLength(0);
    expect(notifyAdmins).not.toHaveBeenCalled();
  });

  test('Refuse la réponse à un brouillon non envoyé', async () => {
    sql([
      [LOAD_QUOTE, [[quoteRow({ status: 'BROUILLON' })], []]],
      [OWN_CLIENTS, [[{ id: 2 }], []]]
    ]);

    const response = await request(app)
      .post('/api/quotes/5/respond')
      .set('Authorization', client())
      .send({ action: 'accept' });

    expect(response.status).toBe(404);
    expect(updates()).toHaveLength(0);
  });

  test('Enregistre l’acceptation et prévient l’équipe', async () => {
    sql([
      [LOAD_QUOTE, [[quoteRow()], []]],
      [OWN_CLIENTS, [[{ id: 2 }], []]],
      [UPDATE_RESPONSE, [{ affectedRows: 1 }, []]]
    ]);

    const response = await request(app)
      .post('/api/quotes/5/respond')
      .set('Authorization', client())
      .send({ action: 'accept' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ACCEPTE' });
    expect(updates()[0][1]).toEqual(['ACCEPTE', 5]);
    expect(notifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'REPONSE_CLIENT', quote_id: 5 })
    );
    expect(notifyEmail).toHaveBeenCalledWith(
      'jules@example.com',
      expect.objectContaining({ type: 'REPONSE_ENREGISTREE' })
    );
  });

  test('Transmet le commentaire d’une demande de modification à l’équipe', async () => {
    sql([
      [LOAD_QUOTE, [[quoteRow()], []]],
      [OWN_CLIENTS, [[{ id: 2 }], []]],
      [UPDATE_RESPONSE, [{ affectedRows: 1 }, []]]
    ]);

    const response = await request(app)
      .post('/api/quotes/5/respond')
      .set('Authorization', client())
      .send({ action: 'modify', comment: 'Ajouter un cocktail de clôture' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('MODIFICATION');
    expect(notifyAdmins.mock.calls[0][0].message).toMatch(
      /cocktail de clôture/
    );
  });

  test('Refuse une seconde réponse sur un devis déjà traité', async () => {
    sql([
      [LOAD_QUOTE, [[quoteRow({ status: 'ACCEPTE' })], []]],
      [OWN_CLIENTS, [[{ id: 2 }], []]],
      [UPDATE_RESPONSE, [{ affectedRows: 0 }, []]]
    ]);

    const response = await request(app)
      .post('/api/quotes/5/respond')
      .set('Authorization', client())
      .send({ action: 'refuse' });

    expect(response.status).toBe(400);
    expect(notifyAdmins).not.toHaveBeenCalled();
  });
});

describe('Devis - envoi au client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Passe le devis en étude et informe le client dans sa messagerie', async () => {
    sql([
      [LOAD_QUOTE, [[quoteRow({ status: 'BROUILLON' })], []]],
      [UPDATE_SEND, [{ affectedRows: 1 }, []]]
    ]);

    const response = await request(app)
      .post('/api/quotes/5/send')
      .set('Authorization', admin())
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ETUDE_CLIENT');
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jules@example.com' })
    );
    expect(notifyEmail).toHaveBeenCalledWith(
      'jules@example.com',
      expect.objectContaining({ type: 'DEVIS_ENVOYE', quote_id: 5 })
    );
  });

  test('Refuse de renvoyer un devis déjà accepté', async () => {
    sql([[LOAD_QUOTE, [[quoteRow({ status: 'ACCEPTE' })], []]]]);

    const response = await request(app)
      .post('/api/quotes/5/send')
      .set('Authorization', admin())
      .send({});

    expect(response.status).toBe(400);
    expect(updates()).toHaveLength(0);
    expect(notifyEmail).not.toHaveBeenCalled();
  });

  test('Refuse l’envoi par un employé', async () => {
    const response = await request(app)
      .post('/api/quotes/5/send')
      .set('Authorization', employee())
      .send({});

    expect(response.status).toBe(403);
  });
});

describe('Messagerie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Refuse la messagerie sans JWT', async () => {
    const response = await request(app).get('/api/notifications');

    expect(response.status).toBe(401);
  });

  test('Renvoie les messages de l’utilisateur connecté', async () => {
    listFor.mockResolvedValue({ unread: 1, items: [] });

    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', client());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ unread: 1, items: [] });
    expect(listFor).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'CLIENT', email: 'jules@example.com' })
    );
  });
});
