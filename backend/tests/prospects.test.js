
const request = require('supertest');
const app = require('../src/server');

describe('API Prospects - Tests métier', () => {
  test('Refuse un prospect sans email', async () => {
    const response = await request(app)
      .post('/api/prospects')
      .send({
        company_name: 'Entreprise Test',
        firstname: 'Marie',
        lastname: 'Dupont',
        phone: '0600000000',
        location: 'Paris',
        event_type: 'Séminaire',
        desired_date: '2026-12-15',
        estimated_participants: 50,
        need_description: 'Organisation d’un séminaire'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Tous les champs sont obligatoires'
    );
  });

  test('Refuse un prospect avec un corps vide', async () => {
    const response = await request(app)
      .post('/api/prospects')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Tous les champs sont obligatoires'
    );
  });

  test('Refuse la consultation des prospects sans JWT', async () => {
    const response = await request(app)
      .get('/api/prospects');

    expect(response.status).toBe(401);
  });
});
