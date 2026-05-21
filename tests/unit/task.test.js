// tests/unit/task.test.js
// Unit tests check individual pieces of logic in isolation.
// We test the validation logic without starting the server.

const request = require('supertest');
const app     = require('../../src/app');

describe('Tasks API', () => {

  describe('POST /api/tasks — create a task', () => {
    it('should create a task with valid data', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Write Dockerfile', priority: 'high' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Write Dockerfile');
      expect(res.body.data.status).toBe('pending');  // default
    });

    it('should reject a task with no title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ priority: 'low' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toContain('title is required');
    });

    it('should reject invalid priority value', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', priority: 'urgent' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/tasks — list tasks', () => {
    it('should return an array', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /health — health check', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

});