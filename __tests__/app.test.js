const request = require('supertest');
const app = require('../src/app');

describe('App General Handlers', () => {
  test('Should return 404 for non-existent routes', async () => {
    await request(app).get('/api/v1/some-random-route').expect(404);
  });
});