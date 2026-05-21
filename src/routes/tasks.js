// src/routes/tasks.js
// Defines all /api/tasks endpoints.
// We use in-memory storage for now.
// Phase 4 will replace this with real PostgreSQL queries.

const express = require('express');
const router  = express.Router();

// In-memory store (temporary)
let tasks  = [];
let nextId = 1;

// ── Validation helper ─────────────────────────────────────────────
const validateTask = (body) => {
  const errors = [];
  if (!body.title || body.title.trim() === '') {
    errors.push('title is required');
  }
  if (body.priority && !['low', 'medium', 'high'].includes(body.priority)) {
    errors.push('priority must be low, medium, or high');
  }
  if (body.status && !['pending', 'in-progress', 'done'].includes(body.status)) {
    errors.push('status must be pending, in-progress, or done');
  }
  return errors;
};

// GET /api/tasks
// Query params: ?status=pending  ?priority=high
router.get('/', (req, res) => {
  let result = [...tasks];

  if (req.query.status) {
    result = result.filter(t => t.status === req.query.status);
  }
  if (req.query.priority) {
    result = result.filter(t => t.priority === req.query.priority);
  }

  res.json({
    success: true,
    count:   result.length,
    data:    result,
  });
});

// POST /api/tasks
router.post('/', (req, res) => {
  const errors = validateTask(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const task = {
    id:          nextId++,
    title:       req.body.title.trim(),
    description: req.body.description?.trim() || '',
    priority:    req.body.priority || 'medium',
    status:      'pending',
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  tasks.push(task);
  res.status(201).json({ success: true, data: task });
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.json({ success: true, data: task });
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const errors = validateTask({ ...tasks[index], ...req.body });
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  tasks[index] = {
    ...tasks[index],
    ...req.body,
    id:        tasks[index].id,       // ID is immutable
    updatedAt: new Date().toISOString(),
  };

  res.json({ success: true, data: tasks[index] });
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const deleted = tasks.splice(index, 1)[0];
  res.json({ success: true, message: 'Task deleted', data: deleted });
});

module.exports = router;