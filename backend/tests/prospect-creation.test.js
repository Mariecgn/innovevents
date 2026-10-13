
const request = require('supertest');

// On simule MariaDB et le service d'e-mail.
jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/services/mailService', () => ({
  sendMail: jest.fn()
}));

const pool = require('../src/config/db');
const { sendMail } = require('../src/services/mailService');
const app = require('../src/server');

describe('Création de prospect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Crée un prospect valide et retourne 201', async () => {
    pool.query.mockResolvedValue([{ insertId: 42 }]);
    sendMail.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/api/prospects')
      .send({
        company_name: 'Entreprise Test',
        firstname: 'Marie',
        lastname: 'Dupont',
        email: 'marie@example.com',
        phone: '0600000000',
        location: 'Paris',
        event_type: 'Séminaire',
        desired_date: '2026-12-15',
        estimated_participants: 50,
        need_description: 'Organisation d’un séminaire'
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(42);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
