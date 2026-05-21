// tests/unit/task.test.js
const request = require('supertest');
const app     = require('../../src/app');

describe('Tasks API', () => {

  // ── POST /api/tasks ───────────────────────────────────────────────
  describe('POST /api/tasks', () => {

    it('creates a task with valid data', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Learn Docker', priority: 'high' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Learn Docker');
      expect(res.body.data.priority).toBe('high');
      expect(res.body.data.status).toBe('pending');      // always starts pending
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.createdAt).toBeDefined();
    });

    it('defaults priority to medium if not provided', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'No priority given' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.priority).toBe('medium');
    });

    it('rejects a task with no title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ priority: 'low' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toContain('title is required');
    });

    it('rejects an empty title string', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: '   ' });

      expect(res.statusCode).toBe(400);
    });

    it('rejects an invalid priority value', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test task', priority: 'urgent' });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toContain('priority must be low, medium, or high');
    });

  });

  // ── GET /api/tasks ────────────────────────────────────────────────
  describe('GET /api/tasks', () => {

    it('returns an array of tasks', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.count).toBe('number');
    });

    it('filters tasks by status', async () => {
      // First create a task so there's something to filter
      await request(app).post('/api/tasks').send({ title: 'Filter test' });

      const res = await request(app).get('/api/tasks?status=pending');
      expect(res.statusCode).toBe(200);
      res.body.data.forEach(task => {
        expect(task.status).toBe('pending');
      });
    });

    it('filters tasks by priority', async () => {
      await request(app).post('/api/tasks').send({ title: 'High task', priority: 'high' });

      const res = await request(app).get('/api/tasks?priority=high');
      expect(res.statusCode).toBe(200);
      res.body.data.forEach(task => {
        expect(task.priority).toBe('high');
      });
    });

  });

  // ── GET /api/tasks/:id ────────────────────────────────────────────
  describe('GET /api/tasks/:id', () => {

    it('returns a single task by ID', async () => {
      // Create one first so we have a real ID
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Find me by ID' });

      const id  = created.body.data.id;
      const res = await request(app).get(`/api/tasks/${id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(id);
      expect(res.body.data.title).toBe('Find me by ID');
    });

    it('returns 404 for a non-existent ID', async () => {
      const res = await request(app).get('/api/tasks/99999');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Task not found');
    });

  });

  // ── PUT /api/tasks/:id ────────────────────────────────────────────
  describe('PUT /api/tasks/:id', () => {

    it('updates a task successfully', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Original title' });

      const id  = created.body.data.id;
      const res = await request(app)
        .put(`/api/tasks/${id}`)
        .send({ title: 'Updated title', status: 'in-progress' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe('Updated title');
      expect(res.body.data.status).toBe('in-progress');
      expect(res.body.data.id).toBe(id);               // ID unchanged
    });

    it('rejects an invalid status value on update', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Task to update' });

      const id  = created.body.data.id;
      const res = await request(app)
        .put(`/api/tasks/${id}`)
        .send({ status: 'completed' });                // invalid — should be 'done'

      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when updating a non-existent task', async () => {
      const res = await request(app)
        .put('/api/tasks/99999')
        .send({ title: 'Ghost update' });

      expect(res.statusCode).toBe(404);
    });

  });

  // ── DELETE /api/tasks/:id ─────────────────────────────────────────
  describe('DELETE /api/tasks/:id', () => {

    it('deletes a task and confirms it is gone', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Delete me' });

      const id = created.body.data.id;

      const del = await request(app).delete(`/api/tasks/${id}`);
      expect(del.statusCode).toBe(200);
      expect(del.body.success).toBe(true);

      // Confirm it no longer exists
      const gone = await request(app).get(`/api/tasks/${id}`);
      expect(gone.statusCode).toBe(404);
    });

    it('returns 404 when deleting a non-existent task', async () => {
      const res = await request(app).delete('/api/tasks/99999');
      expect(res.statusCode).toBe(404);
    });

  });

  // ── Health check ──────────────────────────────────────────────────
  describe('GET /health', () => {
    it('returns healthy status with timestamp', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.timestamp).toBeDefined();
    });
  });

});